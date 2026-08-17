"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");

function fixture() {
  const emitter = new EventEmitter();
  const events = [{ id: "e1", type: "mission.created", occurredAt: new Date().toISOString(), data: {} }];
  const store = { listEvents: async () => events, getRun: async () => undefined, getTask: async () => undefined };
  const runtime = { store, subscribe: (fn) => { emitter.on("event", fn); return () => emitter.off("event", fn); }, action: async () => ({ ok: true }) };
  return { runtime, emitter, events };
}

test("protocol v2 negotiates strictly and serves snapshots, events, resume and pong", async () => {
  const { createProtocolV2Server } = require("../runtime/protocol/protocol-v2");
  const { runtime, emitter, events } = fixture(); const server = createProtocolV2Server({ runtime, store: runtime.store, epoch: 7 });
  assert.equal((await server.handleLine(JSON.stringify({ kind: "hello", protocolVersion: 2, clientId: "c" })))[0].kind, "hello.ack");
  const mismatch = (await server.handleLine(JSON.stringify({ kind: "hello", protocolVersion: 1, clientId: "c" })))[0];
  assert.deepEqual(mismatch.supportedProtocolVersions, [2]);
  const snap = (await server.handleLine(JSON.stringify({ kind: "snapshot.request" })))[0]; assert.equal(snap.kind, "snapshot");
  const frames = []; const off = server.subscribe((frame) => frames.push(frame));
  events.push({ id: "e2", type: "mission.updated", occurredAt: new Date().toISOString(), data: {} }); emitter.emit("event", events[1]);
  await new Promise((resolve) => setImmediate(resolve)); assert.equal(frames[0].kind, "event"); assert.equal(frames[0].seq, 2);
  const resumed = (await server.handleLine(JSON.stringify({ kind: "resume", epoch: 7, cursor: { "mission.*": 1 } })))[0];
  assert.deepEqual(resumed.events.map((e) => e.entry.payload.legacyId), ["e2"]);
  assert.equal((await server.handleLine(JSON.stringify({ kind: "ping", ts: 9 })))[0].kind, "pong");
  off(); server.close();
});
