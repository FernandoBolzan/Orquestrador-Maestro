"use strict";

const crypto = require("node:crypto");

class AttentionProducers {
  constructor({ queue, projectId } = {}) {
    if (!queue || typeof queue.add !== "function") throw new TypeError("queue.add is required");
    this.queue = queue;
    this.projectId = projectId;
  }
  humanApprovalRequest({ missionId, taskGraphId, evalResult = {}, projectId } = {}) {
    return this.queue.add({ id: `attention-${crypto.randomUUID()}`, type: "APPROVAL", projectId: projectId || this.projectId, missionId, severity: "high", title: "Aprovação humana necessária", message: "O plano precisa de uma decisão humana antes de continuar.", reason: evalResult.reason || "Gate de aprovação", impact: "A execução permanece pausada.", evidence: evalResult.blockers || [], recommendation: "Revise o plano e aprove ou rejeite explicitamente.", actions: [{ id: "approve", label: "Aprovar" }, { id: "reject", label: "Rejeitar" }], context: taskGraphId });
  }
  humanInputRequired({ missionId, dimensions = [], projectId } = {}) {
    return this.queue.add({ id: `attention-${crypto.randomUUID()}`, type: "QUESTION", projectId: projectId || this.projectId, missionId, severity: "high", title: "Informação humana necessária", message: `Decisões pendentes: ${dimensions.join(", ") || "escopo"}.`, reason: "O modo automático não tem autorização para responder.", impact: "O refinamento não pode prosseguir.", evidence: dimensions, recommendation: "Responda às perguntas pendentes.", actions: [{ id: "answer", label: "Responder" }] });
  }
}

module.exports = { AttentionProducers };
