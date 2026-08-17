"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { capabilities } = require("../runtime/core");
const { MaestroApplication, ProviderRegistry, projectIdForPath } = require("../runtime/application/maestro-application");
const { startProcess } = require("../runtime/providers/process-execution");
const { RunTerminalBridge } = require("../runtime/runs/run-terminal-bridge");
const { JsonFileRunStore } = require("../runtime/store");
const { TerminalManager } = require("../runtime/terminals/terminal-manager");

class ScriptedProvider {
  constructor({ exitCode = 0 } = {}) { this.id = "scripted-f8"; this.exitCode = exitCode; }
  async detect() { return { id: this.id, installed: true, executable: process.execPath }; }
  async capabilities() { return capabilities({ headless: true, streaming: true }); }
  async execute(request) {
    const script = [
      "console.log('pid:'+process.pid)",
      "setTimeout(()=>console.log('provider:first'),25)",
      "setTimeout(()=>console.log('provider:detached'),120)",
      `setTimeout(()=>process.exit(${this.exitCode}),220)`,
      "setTimeout(()=>process.exit(97),2000)"
    ].join(";");
    return startProcess({ executable: process.execPath, args: ["-e", script], request, providerId: this.id });
  }
}

function createHarness(provider) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "maestro-f8-survival-"));
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "f8-fixture" }), "utf8");
  const store = new JsonFileRunStore({ filePath: path.join(root, "runs.json") });
  const app = new MaestroApplication({
    projectRoot: root, store, providers: new ProviderRegistry([provider]), skills: { get: () => null }
  });
  const terminals = new TerminalManager({ store, emitEvent: (runId, type, data) => app.record(runId, type, data) });
  const terminalSessions = { ptySessions: { available: () => false } };
  const bridge = new RunTerminalBridge({ app, store, terminals, terminalSessions });
  return { app, bridge, root, store, terminalSessions, terminals };
}

function pidFrom(chunks) {
  const match = chunks.join("").match(/pid:(\d+)/u);
  return match ? Number(match[1]) : null;
}

test("F8.3 provider completes after tab switch, window close, and client disconnect", { timeout: 15_000 }, async () => {
  const harness = createHarness(new ScriptedProvider());
  await harness.app.initialize();
  let runId;
  let detachView = () => {};
  const firstChunks = [];
  let firstOutput;
  const receivedFirst = new Promise((resolve) => { firstOutput = resolve; });
  let attached;
  harness.app.subscribe((event) => {
    if (event.type !== "run.created") return;
    runId = event.runId;
    detachView = harness.bridge.subscribe(runId, (output) => {
      firstChunks.push(output.chunk);
      if (pidFrom(firstChunks)) firstOutput();
    });
    attached = harness.bridge.attach({
      runId, projectId: projectIdForPath(harness.root), workspacePath: harness.root,
      command: process.execPath, args: ["-e", "setTimeout(()=>process.exit(0),500)"]
    });
  });

  const executionPromise = harness.app.executeRun({
    description: "prove daemon ownership", providerId: "scripted-f8",
    verificationCommands: [{ name: "pass", command: `${process.execPath} -e \"process.exit(0)\"` }]
  });
  await receivedFirst;
  const providerPid = pidFrom(firstChunks);
  assert.ok(providerPid > 0);
  assert.doesNotThrow(() => process.kill(providerPid, 0));

  detachView();
  harness.app.events.removeAllListeners("event");
  const outcome = await executionPromise;
  assert.equal(outcome.run.status, "completed");
  await attached;

  const reconnected = new RunTerminalBridge({
    app: harness.app, store: harness.store, terminals: harness.terminals,
    terminalSessions: harness.terminalSessions
  });
  const replay = await reconnected.snapshot(runId, 0);
  assert.match(replay.ansi, /provider:first/u);
  assert.match(replay.ansi, /provider:detached/u);
  assert.equal((await harness.store.getRun(runId)).status, "completed");
});

test("F8.3 failed provider settles the run and persists failure without a UI listener", { timeout: 15_000 }, async () => {
  const harness = createHarness(new ScriptedProvider({ exitCode: 7 }));
  await harness.app.initialize();
  let detached = false;
  harness.app.subscribe((event) => {
    if (!detached && event.type === "provider.output") {
      detached = true;
      harness.app.events.removeAllListeners("event");
    }
  });
  const outcome = await harness.app.executeRun({
    description: "prove failed daemon ownership", providerId: "scripted-f8",
    verificationCommands: [{ name: "pass", command: `${process.execPath} -e \"process.exit(0)\"` }]
  });

  assert.equal(outcome.run.status, "failed");
  const events = await harness.store.listEvents({ runId: outcome.run.id });
  assert.ok(events.some((event) => event.type === "run.failed"));
  assert.ok(events.some((event) => event.type === "provider.output" && /provider:detached/u.test(event.data.chunk)));
});
