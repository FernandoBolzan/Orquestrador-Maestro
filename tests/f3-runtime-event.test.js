"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

test("legacy event maps to a validated immutable v2 envelope", async () => {
  const { toRuntimeEvent, validateRuntimeEvent } = require("../runtime/events/runtime-event");
  const legacy = { id: "e1", runId: "r1", type: "run.started", occurredAt: "2026-01-01T00:00:00.000Z", data: { ok: true } };
  const event = await toRuntimeEvent(legacy, { epoch: 3, seq: 4, resolveContext: async () => ({ projectId: "p1", missionId: "m1", taskId: "t1" }) });
  assert.deepEqual(event.payload, { data: { ok: true }, legacyId: "e1" });
  assert.equal(event.version, 2); assert.equal(event.epoch, 3); assert.equal(event.seq, 4);
  assert.equal(event.projectId, "p1"); assert.equal(event.missionId, "m1"); assert.equal(event.taskId, "t1");
  assert.ok(Object.isFrozen(event)); assert.equal(validateRuntimeEvent(event), event);
  assert.throws(() => validateRuntimeEvent({ ...event, seq: -1 }), /seq/);
});
