"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { IdempotencyManager } = require("../runtime/protocol/idempotency");
const { createRuntimeCommand } = require("../runtime/core/runtime-command");

test("R2 — Idempotency: Deduplicates concurrent in-flight executions with same idempotencyKey", async () => {
  const manager = new IdempotencyManager();
  let executionCount = 0;

  const runTask = async () => {
    return manager.execute("task-key-1", async () => {
      executionCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { output: "executed-success" };
    });
  };

  // Launch two concurrent executions with same idempotency key
  const [res1, res2] = await Promise.all([runTask(), runTask()]);

  assert.strictEqual(executionCount, 1, "The task function should have run exactly once");
  assert.strictEqual(res1.output, "executed-success");
  assert.strictEqual(res2.output, "executed-success");
});

test("R2 — Idempotency: Replays cached result on subsequent request with same key", async () => {
  const manager = new IdempotencyManager();
  let executionCount = 0;

  const runTask = async (id) => {
    return manager.execute(id, async () => {
      executionCount += 1;
      return { counter: executionCount };
    });
  };

  const first = await runTask("key-abc");
  assert.strictEqual(first.counter, 1);
  assert.strictEqual(executionCount, 1);

  const second = await runTask("key-abc");
  assert.strictEqual(second.counter, 1, "Cached result returned without re-execution");
  assert.strictEqual(executionCount, 1);

  const different = await runTask("key-xyz");
  assert.strictEqual(different.counter, 2, "Different key executes new computation");
  assert.strictEqual(executionCount, 2);
});

test("R2 — RuntimeCommand: Envelope encapsulates idempotencyKey and command metadata", () => {
  const cmd = createRuntimeCommand({
    type: "run.execute",
    payload: { description: "Build artifact" },
    idempotencyKey: "cmd-key-999"
  });

  assert.strictEqual(cmd.type, "run.execute");
  assert.strictEqual(cmd.idempotencyKey, "cmd-key-999");
  assert.strictEqual(cmd.payload.description, "Build artifact");
  assert.ok(cmd.id);
  assert.ok(cmd.timestamp);
});
