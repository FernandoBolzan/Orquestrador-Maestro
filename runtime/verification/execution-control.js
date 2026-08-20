"use strict";

const { createProgressFingerprint, isProgressMaterial } = require("./progress-fingerprint");

const MISSION_OUTCOMES = Object.freeze([
  "COMPLETED", "NO_OP", "BLOCKED", "FAILED", "EXHAUSTED", "STALLED", "CANCELLED", "NEEDS_ATTENTION"
]);

const DEFAULT_CONTROL_CONFIG = Object.freeze({
  maxAttempts: 5,
  maxDurationMs: 30 * 60 * 1000, // 30 mins
  maxReplans: 3,
  noProgressWindow: 3, // 3 attempts with same fingerprint -> STALLED
  retryBudget: 3
});

function createExecutionControl(config = {}) {
  return Object.freeze({ ...DEFAULT_CONTROL_CONFIG, ...config });
}

class ProgressEvaluator {
  constructor(controlConfig = {}) {
    this.config = createExecutionControl(controlConfig);
    this.fingerprints = [];
    this.attempts = 0;
    this.replans = 0;
    this.startedAt = Date.now();
  }

  recordAttempt({ failingTests = [], changedFiles = [], verification = {}, blockers = [] } = {}) {
    this.attempts += 1;
    const fingerprint = createProgressFingerprint({ failingTests, changedFiles, verification, blockers });
    this.fingerprints.push(fingerprint);
    return fingerprint;
  }

  isStalled() {
    if (this.fingerprints.length < this.config.noProgressWindow) {
      return false;
    }
    const window = this.fingerprints.slice(-this.config.noProgressWindow);
    const firstHash = window[0].compositeHash;
    return window.every((fp) => fp.compositeHash === firstHash);
  }

  isExhausted() {
    if (this.attempts >= this.config.maxAttempts) return true;
    if (this.replans >= this.config.maxReplans) return true;
    if (Date.now() - this.startedAt >= this.config.maxDurationMs) return true;
    return false;
  }

  evaluate({ allTasksCompleted = false, hasBlockers = false, verificationOk = false, cancelled = false, noOp = false } = {}) {
    if (cancelled) {
      return { outcome: "CANCELLED", reason: "Missão cancelada pelo usuário." };
    }

    if (noOp) {
      return { outcome: "NO_OP", reason: "Nenhuma modificação necessária para o objetivo." };
    }

    // Invariant: Agent completed != Task completed (Verification must satisfy criteria)
    if (allTasksCompleted && verificationOk) {
      return { outcome: "COMPLETED", reason: "Todas as tarefas foram concluídas e verificadas com sucesso." };
    }

    if (this.isStalled()) {
      return {
        outcome: "STALLED",
        reason: `Nenhum progresso material detectado nas últimas ${this.config.noProgressWindow} tentativas (fingerprint idêntico).`,
        fingerprint: this.fingerprints[this.fingerprints.length - 1]
      };
    }

    if (this.isExhausted()) {
      return {
        outcome: "EXHAUSTED",
        reason: `Orçamento de execução esgotado (${this.attempts}/${this.config.maxAttempts} tentativas, ${this.replans}/${this.config.maxReplans} replans).`
      };
    }

    if (hasBlockers) {
      return { outcome: "BLOCKED", reason: "Execução bloqueada por dependências ou gates não resolvidos." };
    }

    if (!verificationOk && allTasksCompleted) {
      return { outcome: "NEEDS_ATTENTION", reason: "Tarefas concluídas pelo agente, mas a verificação falhou." };
    }

    return { outcome: "FAILED", reason: "A execução falhou durante o processamento das tarefas." };
  }
}

module.exports = {
  MISSION_OUTCOMES,
  DEFAULT_CONTROL_CONFIG,
  createExecutionControl,
  ProgressEvaluator
};
