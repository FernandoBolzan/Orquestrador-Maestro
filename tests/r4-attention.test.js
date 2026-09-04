"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createAttentionRequest } = require("../runtime/core/entities");
const { JsonFileRunStore } = require("../runtime/store/json-file-run-store");
const { AttentionQueue } = require("../runtime/attention/attention-queue");

function store() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "maestro-attention-"));
  return new JsonFileRunStore({ filePath: path.join(dir, "runs.json") });
}

test("F7 cria e persiste atenção enriquecida", async () => {
  const request = createAttentionRequest({
    id: "a1", type: "APPROVAL", message: "Aprovar plano", projectId: "p1", missionId: "m1",
    severity: "high", title: "Gate humano", actions: [{ id: "approve", label: "Aprovar" }]
  });
  assert.equal(request.severity, "high");
  assert.equal(request.status, "pending");
  const db = store();
  await db.saveAttention(request);
  assert.equal((await db.listAttention({ projectId: "p1", status: "pending" })).length, 1);
});

test("F7 snooze nunca autoriza; approve/reject resolvem", async () => {
  const db = store();
  const queue = new AttentionQueue({ store: db });
  await queue.add({ id: "a1", type: "APPROVAL", message: "Gate" });
  const snoozed = await queue.resolve("a1", { decision: "snooze", resolvedBy: "user" });
  assert.equal(snoozed.status, "snoozed");
  assert.equal(await queue.isAuthorized("a1"), false);
  const approved = await queue.resolve("a1", { decision: "approve", resolvedBy: "user" });
  assert.equal(approved.status, "resolved");
  assert.equal(await queue.isAuthorized("a1"), true);
});
