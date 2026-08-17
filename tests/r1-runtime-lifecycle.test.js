"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { makeTempDir } = require("./test-helpers");

test("runtime lifecycle exposes guarded, immutable transitions", () => {
  const { RUNTIME_LIFECYCLE_CONTRACT, RuntimeInstance } = require("../runtime/lifecycle/runtime-instance");
  assert.deepEqual(RUNTIME_LIFECYCLE_CONTRACT.states, ["stopped", "starting", "running", "stopping"]);
  assert.ok(Object.isFrozen(RUNTIME_LIFECYCLE_CONTRACT));
  assert.ok(Object.isFrozen(RUNTIME_LIFECYCLE_CONTRACT.transitions));

  const instance = new RuntimeInstance({ projectRoot: makeTempDir("maestro-r1-instance-") });
  assert.equal(instance.state, "stopped");
  assert.throws(() => instance.transition("running"), /invalid runtime transition/i);
  instance.transition("starting");
  instance.transition("running");
  instance.transition("stopping");
  instance.transition("stopped");
});

test("disconnecting a TUI client does not stop the per-project daemon", async (t) => {
  const { SocketBridgeClient } = require("../runtime/bridge/socket-client");
  const { launchDaemonFixture, probeRuntimeHealth } = require("../runtime/lifecycle/runtime-instance");
  const projectRoot = makeTempDir("maestro-r1-project-");
  const runFile = path.join(projectRoot, ".runtime", "runs.json");
  const child = await launchDaemonFixture({ projectRoot, runFile });
  t.after(async () => child.stop());

  const client = new SocketBridgeClient({ projectRoot });
  const hello = await client.call("initialize", { protocolVersion: 1 });
  assert.equal(hello.protocolVersion, 1);
  const unsubscribe = client.subscribe(() => {});
  unsubscribe();

  await new Promise((resolve) => setTimeout(resolve, 350));
  assert.doesNotThrow(() => process.kill(child.pid, 0));
  const health = await probeRuntimeHealth({ projectRoot, runFile, mode: "daemon", pid: child.pid, startedAt: child.startedAt });
  assert.equal(health.status, "ok");
  assert.equal(health.socketReachable, true);
  assert.equal(health.storeHealthy, true);
  const state = JSON.parse(fs.readFileSync(runFile, "utf8"));
  assert.ok(state.events.some((event) => event.type === "runtime.heartbeat"));
});

test("in-process health uses the current pid and does not require a socket", async () => {
  const { probeRuntimeHealth } = require("../runtime/lifecycle/runtime-instance");
  const projectRoot = makeTempDir("maestro-r1-local-");
  const runFile = path.join(projectRoot, "runs.json");
  const health = await probeRuntimeHealth({ projectRoot, runFile, mode: "in-process" });
  assert.equal(health.status, "ok");
  assert.equal(health.pid, process.pid);
  assert.equal(health.socketReachable, false);
  assert.equal(health.storeHealthy, true);
});
