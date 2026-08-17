"use strict";

const { createAttentionRequest } = require("../core/entities");

class AttentionQueue {
  constructor({ store, record } = {}) {
    if (!store) throw new TypeError("store is required");
    this.store = store;
    this.record = record;
  }

  async add(input) {
    const request = createAttentionRequest({ ...input, createdAt: input.createdAt || new Date().toISOString() });
    const saved = await this.store.saveAttention(request);
    await this.record?.("attention.created", saved);
    return saved;
  }

  async resolve(id, { decision, resolvedBy, note, snoozedUntil } = {}) {
    if (!["approve", "reject", "snooze"].includes(decision)) throw new TypeError("unknown attention decision");
    const current = await this.store.getAttention(id);
    if (!current) throw new Error(`attention not found: ${id}`);
    const next = {
      ...current,
      status: decision === "snooze" ? "snoozed" : "resolved",
      decision,
      resolvedBy,
      note,
      snoozedUntil: decision === "snooze" ? snoozedUntil : undefined,
      resolvedAt: decision === "snooze" ? undefined : new Date().toISOString()
    };
    const saved = await this.store.saveAttention(next);
    await this.record?.(decision === "snooze" ? "attention.snoozed" : "attention.resolved", saved);
    return saved;
  }

  async isAuthorized(id) {
    const request = await this.store.getAttention(id);
    return request?.status === "resolved" && request.decision === "approve";
  }
}

module.exports = { AttentionQueue };
