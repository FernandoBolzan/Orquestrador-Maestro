"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { JsonFileRunStore } = require("../runtime/store/json-file-run-store");

test("snapshot and cursor converge by per-family sequence", async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "maestro-f3-")); t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const store = new JsonFileRunStore({ filePath: path.join(dir, "runs.json") }); await store.initialize();
  await store.appendEvent({ id: "e1", type: "mission.created", occurredAt: new Date().toISOString(), data: {} });
  await store.appendEvent({ id: "e2", type: "run.created", occurredAt: new Date().toISOString(), data: {} });
  const { buildSnapshot, eventsSince, applySnapshot, nextEpoch } = require("../runtime/events/epoch-sequencer");
  const snapshot = await buildSnapshot({ store, epoch: nextEpoch() });
  assert.equal(snapshot.streams["mission.*"][0].seq, 1); assert.equal(snapshot.streams["task.*"][0].seq, 1);
  const cursor = { epoch: 1, perStream: { "mission.*": 1, "task.*": 1 } };
  await store.appendEvent({ id: "e3", type: "run.started", occurredAt: new Date().toISOString(), data: {} });
  const tail = await eventsSince({ store, cursor });
  assert.deepEqual(tail.events.map((e) => e.payload.legacyId), ["e3"]);
  const state = applySnapshot(applySnapshot({}, snapshot), { epoch: 1, streams: { "task.*": tail.events } });
  assert.deepEqual(state.streams["task.*"].map((e) => e.payload.legacyId), ["e2", "e3"]);
});
