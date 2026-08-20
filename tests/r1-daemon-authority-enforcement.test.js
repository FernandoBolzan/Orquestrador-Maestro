"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { SocketMaestroClient } = require("../runtime/client/socket-maestro-client");
const { createProtocolV2Server } = require("../runtime/protocol/protocol-v2");
const { MaestroApplication } = require("../runtime/application/maestro-application");
const { startSocketRuntime, createBridge } = require("../runtime/bridge");

test("R1 — Daemon Authority: CLI client connects via Socket and routes operations without direct store mutation", async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "maestro-r1-test-"));
  const app = new MaestroApplication({ projectRoot: tmpDir });
  await app.initialize();

  const bridge = createBridge({
    projectRoot: tmpDir,
    services: {
      projectInspector: { inspect: (params) => app.inspectProject(params) },
      skillRegistry: app.skills,
      providerRegistry: { list: () => app.listProviders() },
      runtime: app,
      runStore: {
        listRuns: (filters) => app.listRuns(filters),
        getRun: (id) => app.getRun(id),
        listArtifacts: (filters) => app.listArtifacts(filters),
        getArtifact: (id) => app.getArtifact(id),
        getVerification: (runId) => app.getVerification(runId)
      }
    }
  });

  const protocolV2 = createProtocolV2Server({
    runtime: app,
    store: app.store,
    serverInfo: { name: "test-daemon", projectRoot: tmpDir }
  });

  const socketRuntime = startSocketRuntime(bridge, { projectRoot: tmpDir, protocolV2 });
  await socketRuntime.ready;

  const token = fs.readFileSync(socketRuntime.paths.tokenPath, "utf8").trim();
  const client = new SocketMaestroClient({
    socketPath: socketRuntime.paths.socketPath,
    token,
    clientId: "test-cli-client",
    watchdog: false,
    requestTimeoutMs: 3000
  });

  await client.connect();

  try {
    const health = await client.health();
    assert.strictEqual(health.phase, "connected");

    const project = await client.inspectProject({ projectPath: tmpDir });
    assert.ok(project);
    assert.strictEqual(project.path, tmpDir);

    const mission = await client.createMission({ workspacePath: tmpDir, objective: "Test Daemon Mission" });
    assert.ok(mission);
    assert.strictEqual(mission.objective, "Test Daemon Mission");

    const missions = await client.listMissions({ projectId: project.id });
    assert.ok(Array.isArray(missions));
    assert.ok(missions.some((m) => m.id === mission.id));
  } catch (err) {
    console.error("R1 test error details:", err);
    throw err;
  }

  client.close();
  protocolV2.close();
  await socketRuntime.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
