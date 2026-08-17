"use strict";

const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { JsonFileRunStore } = require("../runtime/store/json-file-run-store");
const { makeTempDir } = require("./test-helpers");

test("restart ignores orphan temporary files and preserves complete JSON", async () => {
  const root = makeTempDir("maestro-r2-crash-");
  const filePath = path.join(root, "runs.json");
  const first = new JsonFileRunStore({ filePath });
  await first.saveMission({ id: "mission-before", projectId: "p", objective: "before" });
  fs.writeFileSync(`${filePath}.orphan.tmp`, "{partial", "utf8");
  const restarted = new JsonFileRunStore({ filePath });
  await restarted.initialize();
  assert.equal((await restarted.listMissions()).length, 1);
  assert.doesNotThrow(() => JSON.parse(fs.readFileSync(filePath, "utf8")));
});

test("atomic flush leaves mode 0600 and no temporary file after success", async () => {
  const root = makeTempDir("maestro-r2-atomic-");
  const filePath = path.join(root, "runs.json");
  const store = new JsonFileRunStore({ filePath });
  await store.appendEvent({ id: "event-complete", type: "test.completed" });
  assert.equal(fs.statSync(filePath).mode & 0o777, 0o600);
  assert.deepEqual(fs.readdirSync(root).filter((name) => name.endsWith(".tmp")), []);
});

test("SIGKILL before rename leaves the previous complete state readable", async (t) => {
  const root = makeTempDir("maestro-r2-kill-");
  const filePath = path.join(root, "runs.json");
  const markerPath = path.join(root, "before-rename.marker");
  const initial = new JsonFileRunStore({ filePath });
  await initial.appendEvent({ id: "event-before", type: "baseline" });
  const fixture = path.join(__dirname, "fixtures", "r2-writer-fixture.js");
  const child = spawn(process.execPath, [fixture, filePath, "crashing", "1", "--crash-marker", markerPath], { stdio: ["ignore", "pipe", "pipe"] });
  t.after(() => { if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL"); });
  const deadline = Date.now() + 3000;
  while (!fs.existsSync(markerPath) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(fs.existsSync(markerPath), true, "fixture must pause immediately before atomic rename");
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill("SIGKILL");
  await exited;

  const persisted = JSON.parse(fs.readFileSync(filePath, "utf8"));
  assert.deepEqual(persisted.events.map((event) => event.id), ["event-before"]);
  const restarted = new JsonFileRunStore({ filePath });
  assert.deepEqual((await restarted.listEvents()).map((event) => event.id), ["event-before"]);
});
