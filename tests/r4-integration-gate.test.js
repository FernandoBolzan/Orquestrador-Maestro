"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { JsonFileRunStore } = require("../runtime/store/json-file-run-store");
const { AttentionQueue } = require("../runtime/attention/attention-queue");
const { AttentionProducers } = require("../runtime/attention/attention-producers");
const { buildSnapshot } = require("../runtime/events/epoch-sequencer");

test("R4 integration gate persiste atenção, snooze não autoriza e replay v2 converge", async () => {
  const filePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "maestro-r4-gate-")), "runs.json");
  const store = new JsonFileRunStore({ filePath }); await store.initialize();
  const record = (type, data) => store.appendEvent({ id: `event-${Date.now()}-${Math.random()}`, type, occurredAt: new Date().toISOString(), data });
  const queue = new AttentionQueue({ store, record });
  const producers = new AttentionProducers({ queue, projectId: "p1" });
  const request = await producers.humanApprovalRequest({ missionId: "m1", taskGraphId: "g1", evalResult: { reason: "gate.required" } });
  await queue.resolve(request.id, { decision: "snooze" });
  assert.equal(await queue.isAuthorized(request.id), false);
  await queue.resolve(request.id, { decision: "approve" });
  assert.equal(await queue.isAuthorized(request.id), true);
  const reopened = new JsonFileRunStore({ filePath }); await reopened.initialize();
  assert.equal((await reopened.getAttention(request.id)).status, "resolved");
  const snapshot = await buildSnapshot({ store: reopened, epoch: 1 });
  assert.deepEqual(snapshot.streams["attention.*"].map((event) => event.type), ["attention.created", "attention.snoozed", "attention.resolved"]);
});
