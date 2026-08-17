"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { MaestroApplication } = require("../runtime/application/maestro-application");
const { RunTerminalBridge } = require("../runtime/runs/run-terminal-bridge");
const { JsonFileRunStore } = require("../runtime/store");
const { TerminalManager } = require("../runtime/terminals/terminal-manager");
const { TerminalSessionManager } = require("../runtime/terminals/session-manager");

const gated = process.env.PTY_E2E_GATED === "1";

test("F8.3 real PTY process survives observer disconnect", { skip: !gated, timeout: 15_000 }, async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "maestro-f8-real-pty-"));
  const store = new JsonFileRunStore({ filePath: path.join(root, "runs.json") });
  const app = new MaestroApplication({ projectRoot: root, store });
  await app.initialize();
  await store.createProject({ id: "project-f8-pty", path: root, name: "F8 PTY" });
  await store.saveTask({ id: "task-f8-pty", projectId: "project-f8-pty", description: "PTY" });
  await store.saveRun({ id: "run-f8-pty", taskId: "task-f8-pty", providerId: "fake", status: "running", metadata: {} });
  const terminalSessions = new TerminalSessionManager({ store, emitEvent: (runId, type, data) => app.record(runId, type, data) });
  assert.equal(terminalSessions.ptySessions.available(), true, "PTY_E2E_GATED=1 requires a working node-pty installation");
  const bridge = new RunTerminalBridge({
    app, store, terminalSessions,
    terminals: new TerminalManager({ store, emitEvent: (runId, type, data) => app.record(runId, type, data) })
  });
  const chunks = [];
  const detach = bridge.subscribe("run-f8-pty", (event) => chunks.push(event.chunk));
  await bridge.attach({
    runId: "run-f8-pty", projectId: "project-f8-pty", workspacePath: root,
    command: process.execPath,
    args: ["-e", "setTimeout(()=>console.log('pty:first'),30);setTimeout(()=>console.log('pty:detached'),150);setTimeout(()=>process.exit(0),250)"]
  });
  const deadline = Date.now() + 5_000;
  while (!chunks.join("").includes("pty:first") && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 10));
  assert.match(chunks.join(""), /pty:first/u);
  detach();
  while (!(await bridge.snapshot("run-f8-pty", 0)).ansi.includes("pty:detached") && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 10));
  assert.match((await bridge.snapshot("run-f8-pty", 0)).ansi, /pty:detached/u);
});
