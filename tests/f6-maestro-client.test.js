"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

test("local client implements the frozen interface and availability taxonomy", async () => {
  const { MAESTRO_CLIENT_INTERFACE, LocalMaestroClient, MaestroClientError, predictAvailability } = require("../runtime/client/maestro-client");
  const events = [];
  const store = { listEvents: async () => events, getRun: async () => undefined, getTask: async () => undefined };
  const app = {
    store, subscribe: () => () => {}, listProjects: async () => [], listMissions: async () => [], listRuns: async () => [],
    createMission: async (p) => p, createRun: async (p) => p, executeRun: async (p) => p, cancelRun: async () => false,
    listProviders: async () => [], skills: { list: () => [] }, listTerminalSessions: async () => [], createTerminalSession: async (p) => p,
    closeTerminalSession: async () => true
  };
  const client = new LocalMaestroClient({ app, epoch: 2 });
  assert.ok(Object.isFrozen(MAESTRO_CLIENT_INTERFACE));
  for (const name of Object.keys(MAESTRO_CLIENT_INTERFACE)) assert.equal(typeof client[name], "function", name);
  assert.equal((await client.snapshot()).epoch, 2);
  assert.deepEqual(predictAvailability({ type: "run.cancel", run: { status: "running" } }), { available: true });
  assert.equal(predictAvailability({ type: "run.cancel", run: { status: "completed" } }).reason, "not_running");
  assert.equal(predictAvailability({ type: "mission.cancel", confirm: "no" }).reason, "double_confirm");
  await assert.rejects(client.action({ type: "run.cancel", payload: { run: { status: "completed" } } }), (e) => e instanceof MaestroClientError && e.reason === "not_running");
});
