"use strict";

const crypto = require("node:crypto");

class AttentionPolicy {
  constructor({ queue, maxAutoRetries = 3 } = {}) {
    this.queue = queue;
    this.maxAutoRetries = maxAutoRetries;
  }

  async evaluateTaskBlock(taskBlock, context = {}) {
    const attempts = Number.isInteger(context.attempts) ? context.attempts : 1;
    const isAutomatic = taskBlock.recoverability === "AUTOMATIC";
    const isRetryable = taskBlock.recoverability === "RETRYABLE" && attempts <= this.maxAutoRetries;

    if (isAutomatic || isRetryable) {
      return {
        requiresAttention: false,
        action: isAutomatic ? "auto_resolve" : "retry",
        attempts
      };
    }

    const type = taskBlock.blockKind === "approval" ? "APPROVAL"
      : taskBlock.blockKind === "human_input" ? "QUESTION"
      : "BLOCKER";

    const severity = taskBlock.recoverability === "OPERATOR_REQUIRED" ? "critical" : "high";
    const actions = context.actions || (
      type === "APPROVAL" ? [{ id: "approve", label: "Aprovar" }, { id: "reject", label: "Rejeitar" }]
      : type === "QUESTION" ? [{ id: "answer", label: "Responder" }, { id: "skip", label: "Ignorar" }]
      : [{ id: "retry", label: "Tentar novamente" }, { id: "skip", label: "Ignorar tarefa" }, { id: "cancel", label: "Cancelar missão" }]
    );

    const whatTried = context.whatTried || [
      `Detecção de bloqueio: ${taskBlock.blockKind} (${taskBlock.reason})`,
      `Classificação de recuperabilidade: ${taskBlock.recoverability}`,
      `Tentativas automáticas realizadas: ${attempts}`
    ];

    const attentionItem = {
      id: `attention-${crypto.randomUUID()}`,
      type,
      projectId: context.projectId,
      missionId: context.missionId,
      taskId: context.taskId,
      severity,
      title: `Intervenção necessária: ${taskBlock.reason}`,
      message: taskBlock.reason,
      reason: taskBlock.reason,
      risk: context.risk || "Execução interrompida aguardando intervenção humana.",
      impact: context.impact || "Tarefas subsequentes dependentes estão bloqueadas.",
      evidence: Array.isArray(context.evidence) ? context.evidence : [taskBlock.reason],
      attempts,
      whatTried,
      recoverability: taskBlock.recoverability,
      recommendation: context.recommendation || (
        type === "APPROVAL" ? "Revise o plano/mudança e tome uma decisão de aprovação."
        : type === "QUESTION" ? "Forneça as informações necessárias para prosseguir."
        : "Inspecione a falha e decida se deseja tentar novamente ou ajustar o ambiente."
      ),
      actions
    };

    if (this.queue && typeof this.queue.add === "function") {
      await this.queue.add(attentionItem);
    }

    return {
      requiresAttention: true,
      attentionItem
    };
  }

  async evaluateVerificationFailure(verificationResult, context = {}) {
    const attempts = Number.isInteger(context.attempts) ? context.attempts : 1;
    const failedChecks = (verificationResult?.checks || []).filter((c) => c.exitCode !== 0);
    const summary = failedChecks.map((c) => `${c.name}: ${c.stderr || c.stdout || `exit code ${c.exitCode}`}`).join("; ") || "Verificação falhou";

    return this.evaluateTaskBlock({
      source: "verification_engine",
      blockKind: "verification",
      recoverability: attempts < this.maxAutoRetries ? "RETRYABLE" : "HUMAN_REQUIRED",
      reason: summary,
      occurredAt: new Date().toISOString(),
      recurrence: attempts
    }, {
      ...context,
      attempts,
      evidence: failedChecks.map((c) => ({ name: c.name, command: c.command, exitCode: c.exitCode, output: c.stderr || c.stdout })),
      whatTried: [`Executados ${verificationResult?.checks?.length || 0} comandos de verificação`, `Falharam: ${failedChecks.length} comando(s)`],
      recommendation: "Analise a saída dos testes e corrija o código antes de aprovar a conclusão da tarefa."
    });
  }
}

module.exports = { AttentionPolicy };
