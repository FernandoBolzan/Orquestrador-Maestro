"use strict";

class IdempotencyManager {
  constructor({ maxEntries = 5000, ttlMs = 24 * 60 * 60 * 1000 } = {}) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
    this.settled = new Map(); // key -> { result, ok, reason, timestamp }
    this.inFlight = new Map(); // key -> Promise
  }

  has(key) {
    if (!key) return false;
    const entry = this.settled.get(key);
    if (!entry) return false;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.settled.delete(key);
      return false;
    }
    return true;
  }

  get(key) {
    if (!key) return undefined;
    const entry = this.settled.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.settled.delete(key);
      return undefined;
    }
    return entry;
  }

  async execute(key, executor) {
    if (!key || typeof key !== "string" || key.trim() === "") {
      return executor();
    }

    const existing = this.get(key);
    if (existing) {
      return existing.result;
    }

    if (this.inFlight.has(key)) {
      return this.inFlight.get(key);
    }

    const promise = (async () => {
      try {
        const rawResult = await executor();
        const ok = rawResult?.ok !== false;
        const reason = rawResult?.reason;
        const record = { ok, reason, result: rawResult, timestamp: Date.now() };
        this._store(key, record);
        return rawResult;
      } catch (error) {
        const record = { ok: false, reason: error?.reason || error.code || "execution_failed", error: error.message, timestamp: Date.now() };
        this._store(key, record);
        throw error;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  _store(key, record) {
    if (this.settled.size >= this.maxEntries) {
      const oldestKey = this.settled.keys().next().value;
      this.settled.delete(oldestKey);
    }
    this.settled.set(key, record);
  }

  clear() {
    this.settled.clear();
    this.inFlight.clear();
  }
}

module.exports = { IdempotencyManager };
