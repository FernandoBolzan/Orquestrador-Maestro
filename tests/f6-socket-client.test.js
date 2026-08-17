"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs/promises");
const { createProtocolV2Server } = require("../runtime/protocol/protocol-v2");

test("socket client handshakes, snapshots and receives incremental events", async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "maestro-f6-")); t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const socketPath = path.join(dir, "runtime.sock"); const listeners = new Set();
  const events = [{ id: "e1", type: "mission.created", occurredAt: new Date().toISOString(), data: {} }];
  const store = { listEvents: async () => events, getRun: async () => undefined, getTask: async () => undefined };
  const protocol = createProtocolV2Server({ store, runtime: { store, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }, async action() { return { ok: true }; } } });
  const sockets = new Set();
  const server = net.createServer((socket) => { sockets.add(socket); let buffer = ""; const off = protocol.subscribe((m) => socket.write(`${JSON.stringify(m)}\n`)); socket.on("close", () => { sockets.delete(socket); off(); }); socket.on("data", async (chunk) => { buffer += chunk; let i; while ((i = buffer.indexOf("\n")) >= 0) { const line = buffer.slice(0, i); buffer = buffer.slice(i + 1); for (const response of await protocol.handleLine(line)) socket.write(`${JSON.stringify(response)}\n`); } }); });
  await new Promise((resolve, reject) => server.listen(socketPath, (e) => e ? reject(e) : resolve())); t.after(() => { for (const s of sockets) s.destroy(); server.close(); protocol.close(); });
  const { SocketMaestroClient } = require("../runtime/client/socket-maestro-client"); const client = new SocketMaestroClient({ socketPath, watchdog: false }); t.after(() => client.close());
  await client.connect(); const snapshot = await client.snapshot(); assert.equal(snapshot.epoch, 1);
  const received = new Promise((resolve) => client.subscribe(resolve));
  const event = { id: "e2", type: "mission.updated", occurredAt: new Date().toISOString(), data: {} }; events.push(event); for (const fn of listeners) fn(event);
  assert.equal((await received).entry.payload.legacyId, "e2"); assert.equal((await client.health()).phase, "connected");
});
