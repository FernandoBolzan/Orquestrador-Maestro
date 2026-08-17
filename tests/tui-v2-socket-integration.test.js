"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createBridge } = require("../runtime/bridge/bridge");
const { startSocketRuntime } = require("../runtime/bridge/socket-server");
const { createProtocolV2Server } = require("../runtime/protocol/protocol-v2");
const { SocketMaestroClient } = require("../runtime/client/socket-maestro-client");
const { JsonFileRunStore } = require("../runtime/store/json-file-run-store");

test("TUI v2 conecta no socket runtime e executa operações completas sem JSON-RPC", async (t) => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "maestro-v2-tui-"));
  const store = new JsonFileRunStore({ filePath: path.join(projectRoot, "runs.json") }); await store.initialize();
  const calls = [];
  const runtime = {
    store, subscribe: () => () => {},
    attention: { resolve: async (id, resolution) => ({ id, ...resolution, status: resolution.decision === "snooze" ? "snoozed" : "resolved" }) },
    inspectProject: async () => ({ id: "p1", name: "P", path: projectRoot }), listProjects: async () => [], listMissions: async () => [],
    listTerminalSessions: async () => [], updateMission: async (id, patch) => ({ id, ...patch }),
    snapshotTerminalSession: async (id) => ({ id, lines: [] }), focusTerminalSession: async () => true,
    inputTerminalSession: async (_id, input) => { calls.push(input); return true; }
  };
  const v2 = createProtocolV2Server({ runtime, store });
  const socketRuntime = startSocketRuntime(createBridge({ services: { runtime } }), { projectRoot, protocolV2: v2 });
  await socketRuntime.ready;
  const token = fs.readFileSync(socketRuntime.paths.tokenPath, "utf8").trim();
  const client = new SocketMaestroClient({ socketPath: socketRuntime.paths.socketPath, token, watchdog: false, requestTimeoutMs: 1000 });
  await client.initialize();
  assert.equal((await client.inspectProject({ projectPath: projectRoot })).id, "p1");
  assert.equal((await client.updateMission("m1", { status: "running" })).status, "running");
  assert.deepEqual((await client.snapshotTerminalSession("term1")).lines, []);
  assert.equal(await client.focusTerminalSession("term1"), true);
  assert.equal(await client.inputTerminalSession("term1", "x"), true);
  assert.equal((await client.resolveAttention("attention-1", "snooze")).status, "snoozed");
  assert.equal((await client.resolveAttention("attention-1", "approve")).status, "resolved");
  assert.deepEqual(calls, ["x"]);
  assert.equal((await client.health()).transport, "socket");
  client.close(); await socketRuntime.close(); v2.close();
});
