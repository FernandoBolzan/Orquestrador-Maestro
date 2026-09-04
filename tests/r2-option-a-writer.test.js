"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { makeTempDir } = require("./test-helpers");

test("one daemon serializes concurrent RPC mutations into its project store", async (t) => {
  const { SocketBridgeClient } = require("../runtime/bridge/socket-client");
  const { launchDaemonFixture } = require("../runtime/lifecycle/runtime-instance");
  const projectRoot = makeTempDir("maestro-r2-single-writer-");
  const runFile = path.join(projectRoot, ".runtime", "runs.json");
  const daemon = await launchDaemonFixture({ projectRoot, runFile, heartbeat: false });
  t.after(async () => daemon.stop());
  const clients = [new SocketBridgeClient({ projectRoot }), new SocketBridgeClient({ projectRoot })];
  await Promise.all(Array.from({ length: 40 }, (_, index) => clients[index % 2].call("missions.create", {
    objective: `mission-${index}`, workspacePath: projectRoot
  })));
  const state = JSON.parse(fs.readFileSync(runFile, "utf8"));
  assert.equal(state.missions.length, 40);
  assert.equal(new Set(state.missions.map((mission) => mission.id)).size, 40);
  assert.equal(state.events.filter((event) => event.type === "mission.created").length, 40);
});
