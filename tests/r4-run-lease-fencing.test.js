"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { RunLeaseManager, createRunLease } = require("../runtime/runs/run-lease");

test("R4 — Run Lease: Acquires, heartbeats, and releases lease", () => {
  const manager = new RunLeaseManager({ defaultTtlMs: 5000 });

  const lease = manager.acquire("run-100", "session-A");
  assert.strictEqual(lease.runId, "run-100");
  assert.strictEqual(lease.ownerSessionId, "session-A");
  assert.strictEqual(lease.generation, 1);

  // Heartbeat extends expiration
  const updated = manager.heartbeat("run-100", "session-A", 1, { ttlMs: 10000 });
  assert.strictEqual(updated.generation, 1);
  assert.ok(new Date(updated.expiresAt).getTime() > new Date(lease.expiresAt).getTime());

  // Release
  const released = manager.release("run-100", "session-A", 1);
  assert.strictEqual(released, true);
  assert.strictEqual(manager.getLease("run-100"), null);
});

test("R4 — Run Lease: Recovers stale leases and increments generation", () => {
  const manager = new RunLeaseManager({ defaultTtlMs: 100 });
  manager.acquire("run-200", "session-old", { ttlMs: 50 });

  // Simulate time passage
  const futureTime = Date.now() + 1000;
  const recovered = manager.recoverStale(futureTime);

  assert.strictEqual(recovered.length, 1);
  assert.strictEqual(recovered[0].runId, "run-200");
  assert.strictEqual(recovered[0].previousOwner, "session-old");
  assert.strictEqual(recovered[0].previousGeneration, 1);
  assert.strictEqual(recovered[0].newGeneration, 2);

  const currentLease = manager.getLease("run-200");
  assert.strictEqual(currentLease.generation, 2);
  assert.strictEqual(currentLease.recoveryCount, 1);
});

test("R4 — Fencing Protection: Old session with stale generation is FENCED from finishing recovered run", () => {
  const manager = new RunLeaseManager({ defaultTtlMs: 50 });

  // Session A acquires generation 1
  const lease1 = manager.acquire("run-300", "session-A", { ttlMs: 50 });
  assert.strictEqual(lease1.generation, 1);

  // Lease expires and recovery happens -> generation becomes 2
  manager.recoverStale(Date.now() + 1000);

  // Session B acquires recovered run at generation 2
  const lease2 = manager.acquire("run-300", "session-B", { generation: 2 });
  assert.strictEqual(lease2.generation, 2);
  assert.strictEqual(lease2.ownerSessionId, "session-B");

  // Old Session A wakes up and tries to complete run with generation 1 -> MUST BE FENCED
  assert.throws(
    () => {
      manager.verifyFencing("run-300", "session-A", 1);
    },
    (err) => {
      return err.code === "FENCED" || err.reason === "fenced";
    },
    "Old session with stale generation must be rejected with FENCED error"
  );

  // Valid Session B with generation 2 succeeds
  assert.doesNotThrow(() => {
    manager.verifyFencing("run-300", "session-B", 2);
  });
});
