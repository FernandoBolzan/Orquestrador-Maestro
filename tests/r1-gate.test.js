"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { runtimePaths } = require("../runtime/bridge/socket-server");
const { SocketMaestroClient } = require("../runtime/client/socket-maestro-client");

async function waitFor(check, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try { const value = await check(); if (value) return value; } catch { /* runtime is still starting */ }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("runtime did not become ready");
}

test("R1 gate: fechar clientes não mata o runtime por projeto", async (t) => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "maestro-r1-gate-"));
  const child = spawn(process.execPath, [path.resolve(__dirname, "../bin/orquestrador-maestro.js"), "runtime", "--project-path", projectRoot], { stdio: "ignore" });
  t.after(() => { if (!child.killed) child.kill("SIGINT"); });
  const paths = runtimePaths(projectRoot);
  const token = await waitFor(() => fs.existsSync(paths.tokenPath) && fs.readFileSync(paths.tokenPath, "utf8").trim());
  const first = new SocketMaestroClient({ socketPath: paths.socketPath, token, watchdog: false, requestTimeoutMs: 1000 });
  await waitFor(() => first.initialize().then(() => true));
  assert.equal((await first.health()).phase, "connected");
  first.close();
  const second = new SocketMaestroClient({ socketPath: paths.socketPath, token, watchdog: false, requestTimeoutMs: 1000 });
  await second.initialize();
  assert.equal((await second.inspectProject({ projectPath: projectRoot })).path, projectRoot);
  second.close();
  child.kill("SIGINT");
  await new Promise((resolve) => child.once("exit", resolve));
});
