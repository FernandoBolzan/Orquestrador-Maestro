"use strict";

const { assertObject, requiredString, optionalTimestamp } = require("../core/validation");

function createRunLease(input = {}) {
  assertObject(input, "run lease");
  const runId = requiredString(input.runId, "run lease.runId");
  const ownerSessionId = requiredString(input.ownerSessionId, "run lease.ownerSessionId");
  const generation = Number.isInteger(input.generation) && input.generation >= 1 ? input.generation : 1;
  const acquiredAt = input.acquiredAt || new Date().toISOString();
  const heartbeatAt = input.heartbeatAt || acquiredAt;
  const expiresAt = input.expiresAt || new Date(Date.now() + 30000).toISOString();
  const recoveryCount = Number.isInteger(input.recoveryCount) && input.recoveryCount >= 0 ? input.recoveryCount : 0;

  return Object.freeze({
    kind: "run_lease",
    runId,
    ownerSessionId,
    generation,
    acquiredAt,
    heartbeatAt,
    expiresAt,
    recoveryCount
  });
}

class RunLeaseManager {
  constructor({ defaultTtlMs = 30000 } = {}) {
    this.defaultTtlMs = defaultTtlMs;
    this.leases = new Map(); // runId -> RunLease
  }

  getLease(runId) {
    return this.leases.get(runId) || null;
  }

  acquire(runId, ownerSessionId, { ttlMs, generation } = {}) {
    const existing = this.leases.get(runId);
    const now = Date.now();
    const ttl = ttlMs || this.defaultTtlMs;
    const expiresAt = new Date(now + ttl).toISOString();
    const acquiredAt = new Date(now).toISOString();

    if (existing) {
      const isExpired = new Date(existing.expiresAt).getTime() <= now;
      const isPendingRecovery = existing.ownerSessionId.startsWith("recovered-pending");
      if (!isExpired && !isPendingRecovery && existing.ownerSessionId !== ownerSessionId) {
        const error = new Error(`Run ${runId} is currently leased by session ${existing.ownerSessionId}`);
        error.code = "RUN_LEASED";
        throw error;
      }
      const nextGen = generation || (existing.ownerSessionId === ownerSessionId ? existing.generation : existing.generation);
      const lease = createRunLease({
        runId,
        ownerSessionId,
        generation: nextGen,
        acquiredAt,
        heartbeatAt: acquiredAt,
        expiresAt,
        recoveryCount: existing.recoveryCount
      });
      this.leases.set(runId, lease);
      return lease;
    }

    const lease = createRunLease({
      runId,
      ownerSessionId,
      generation: generation || 1,
      acquiredAt,
      heartbeatAt: acquiredAt,
      expiresAt,
      recoveryCount: 0
    });
    this.leases.set(runId, lease);
    return lease;
  }

  heartbeat(runId, ownerSessionId, generation, { ttlMs } = {}) {
    const lease = this.leases.get(runId);
    if (!lease) {
      const error = new Error(`No lease exists for run ${runId}`);
      error.code = "LEASE_NOT_FOUND";
      throw error;
    }

    this.verifyFencing(runId, ownerSessionId, generation);

    const now = Date.now();
    const ttl = ttlMs || this.defaultTtlMs;
    const updated = createRunLease({
      ...lease,
      heartbeatAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ttl).toISOString()
    });
    this.leases.set(runId, updated);
    return updated;
  }

  verifyFencing(runId, ownerSessionId, generation) {
    const lease = this.leases.get(runId);
    if (!lease) return; // No active lease to fence against

    if (lease.generation > generation) {
      const error = new Error(`Fenced: stale generation ${generation} for run ${runId} (current generation: ${lease.generation})`);
      error.code = "FENCED";
      error.reason = "fenced";
      throw error;
    }

    if (lease.ownerSessionId !== ownerSessionId) {
      const error = new Error(`Fenced: session ${ownerSessionId} is not the current owner of run ${runId} (owned by ${lease.ownerSessionId})`);
      error.code = "FENCED";
      error.reason = "fenced";
      throw error;
    }

    const now = Date.now();
    if (new Date(lease.expiresAt).getTime() <= now) {
      const error = new Error(`Run lease for ${runId} has expired`);
      error.code = "LEASE_EXPIRED";
      error.reason = "lease_expired";
      throw error;
    }
  }

  release(runId, ownerSessionId, generation) {
    const lease = this.leases.get(runId);
    if (!lease) return false;
    if (generation !== undefined && lease.generation !== generation) return false;
    if (ownerSessionId && lease.ownerSessionId !== ownerSessionId) return false;
    this.leases.delete(runId);
    return true;
  }

  recoverStale(now = Date.now()) {
    const recovered = [];
    for (const [runId, lease] of this.leases.entries()) {
      if (new Date(lease.expiresAt).getTime() <= now) {
        // Lease is stale -> bump generation and increment recoveryCount
        const nextGeneration = lease.generation + 1;
        const recoveryCount = lease.recoveryCount + 1;
        const recoveredLease = createRunLease({
          runId,
          ownerSessionId: `recovered-pending-${nextGeneration}`,
          generation: nextGeneration,
          acquiredAt: new Date(now).toISOString(),
          heartbeatAt: new Date(now).toISOString(),
          expiresAt: new Date(now).toISOString(), // Expired immediately so it can be claimed
          recoveryCount
        });
        this.leases.set(runId, recoveredLease);
        recovered.push({
          runId,
          previousOwner: lease.ownerSessionId,
          previousGeneration: lease.generation,
          newGeneration: nextGeneration,
          recoveryCount
        });
      }
    }
    return recovered;
  }
}

module.exports = {
  createRunLease,
  RunLeaseManager
};
