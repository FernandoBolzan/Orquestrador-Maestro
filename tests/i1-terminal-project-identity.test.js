"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { JsonFileRunStore } = require("../runtime/store/json-file-run-store");
const { TerminalManager } = require("../runtime/terminals/terminal-manager");

test("terminal output and completion events preserve project identity for interleaved projects", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "maestro-terminal-identity-"));
  const store = new JsonFileRunStore({ filePath: path.join(root, "runs.json") });
  await store.initialize();
  const events = [];
  const manager = new TerminalManager({ store, emitEvent: async (_runId, type, data) => events.push({ type, data }) });
  const alpha = await manager.start({ projectId: "project-alpha", cwd: root, command: process.execPath, args: ["-e", "process.stdout.write('A1\\nA2\\n')"] });
  const beta = await manager.start({ projectId: "project-beta", cwd: root, command: process.execPath, args: ["-e", "process.stdout.write('B1\\nB2\\n')"] });
  await Promise.all([manager.wait(alpha.id), manager.wait(beta.id)]);
  const output = events.filter((event) => event.type === "terminal.output");
  const completed = events.filter((event) => event.type === "terminal.completed");
  assert.ok(output.length >= 2);
  assert.ok(output.filter((event) => event.data.terminalId === alpha.id).every((event) => event.data.projectId === "project-alpha"));
  assert.ok(output.filter((event) => event.data.terminalId === beta.id).every((event) => event.data.projectId === "project-beta"));
  assert.equal(completed.find((event) => event.data.terminalId === alpha.id)?.data.projectId, "project-alpha");
  assert.equal(completed.find((event) => event.data.terminalId === beta.id)?.data.projectId, "project-beta");
});
