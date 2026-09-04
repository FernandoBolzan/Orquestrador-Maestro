"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { runtimePaths } = require("../runtime/bridge/socket-server");
const { SocketMaestroClient } = require("../runtime/client/socket-maestro-client");

test("R1.4 maestro tui inicia daemon canônico e sair da view não o encerra", { skip: process.platform === "win32" }, async (t) => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "maestro-tui-survival-"));
  const fakeBin = fs.mkdtempSync(path.join(os.tmpdir(), "maestro-fake-bun-"));
  const bun = path.join(fakeBin, "bun");
  fs.writeFileSync(bun, "#!/bin/sh\nexit 0\n", { mode: 0o755 });
  const cli = path.resolve(__dirname, "../bin/orquestrador-maestro.js");
  const result = spawnSync(process.execPath, [cli, "tui", "--project-path", projectRoot], { env: { ...process.env, PATH: `${fakeBin}${path.delimiter}${process.env.PATH || ""}` }, encoding: "utf8", timeout: 10_000 });
  assert.equal(result.status, 0, result.stderr);
  const paths = runtimePaths(projectRoot);
  assert.equal(fs.existsSync(paths.pidPath), true, "daemon pid must remain after TUI exits");
  const pid = Number(fs.readFileSync(paths.pidPath, "utf8").trim());
  t.after(() => { try { process.kill(pid, "SIGTERM"); } catch {} });
  const token = fs.readFileSync(paths.tokenPath, "utf8").trim();
  const client = new SocketMaestroClient({ socketPath: paths.socketPath, token, watchdog: false, requestTimeoutMs: 1000 });
  await client.initialize();
  assert.equal((await client.health()).phase, "connected");
  assert.equal((await client.inspectProject({ projectPath: projectRoot })).path, projectRoot);
  client.close();
});
