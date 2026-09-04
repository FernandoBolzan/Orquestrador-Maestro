"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const { JsonFileRunStore } = require("../runtime/store/json-file-run-store");
const { createProjectRuntimeOwnership } = require("../runtime/ownership/ownership-map");
const { makeTempDir } = require("./test-helpers");

test("per-project stores restart independently without cross-project leakage", async () => {
  const root = makeTempDir("maestro-r2-isolation-");
  const a = createProjectRuntimeOwnership(path.join(root, "alpha"));
  const b = createProjectRuntimeOwnership(path.join(root, "beta"));
  const stores = [a, b].map((owner) => new JsonFileRunStore({ filePath: owner.storeFile }));
  await stores[0].saveMission({ id: "mission-a", projectId: a.projectId, objective: "alpha" });
  await stores[1].saveMission({ id: "mission-b", projectId: b.projectId, objective: "beta" });
  await stores[0].appendEvent({ id: "event-a", projectId: a.projectId, type: "mission.created" });
  await stores[1].appendEvent({ id: "event-b", projectId: b.projectId, type: "mission.created" });

  const restartedA = new JsonFileRunStore({ filePath: a.storeFile });
  const restartedB = new JsonFileRunStore({ filePath: b.storeFile });
  assert.deepEqual((await restartedA.listMissions()).map((item) => item.id), ["mission-a"]);
  assert.deepEqual((await restartedB.listMissions()).map((item) => item.id), ["mission-b"]);
  assert.deepEqual((await restartedA.listEvents()).map((item) => item.id), ["event-a"]);
  assert.deepEqual((await restartedB.listEvents()).map((item) => item.id), ["event-b"]);
});
