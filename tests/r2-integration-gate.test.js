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

test("R2 integration gate mantém v1 e v2 no mesmo socket autenticado", async () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "maestro-r2-gate-"));
  const store = new JsonFileRunStore({ filePath: path.join(projectRoot, "runs.json") }); await store.initialize();
  const runtime = { store, subscribe: () => () => {}, inspectProject: async () => ({ id: "p1", path: projectRoot }) };
  const protocol = createProtocolV2Server({ runtime, store });
  const socket = startSocketRuntime(createBridge({ services: { runtime, projectInspector: { inspect: runtime.inspectProject } } }), { projectRoot, protocolV2: protocol });
  await socket.ready;
  const token = fs.readFileSync(socket.paths.tokenPath, "utf8").trim();
  const client = new SocketMaestroClient({ socketPath: socket.paths.socketPath, token, watchdog: false, requestTimeoutMs: 1000 });
  await client.initialize();
  assert.equal((await client.snapshot()).kind, "snapshot");
  assert.equal((await client.inspectProject({ projectPath: projectRoot })).id, "p1");
  client.close(); await socket.close(); protocol.close();
});
