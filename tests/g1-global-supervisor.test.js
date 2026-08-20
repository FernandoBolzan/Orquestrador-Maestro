"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { MaestroSupervisor } = require("../runtime/supervisor/supervisor");

test("G1 — Global Supervisor: Coordinates multi-project runtimes without monolithic state fusion", async () => {
  const mockRuntimeA = {
    inspectProject: async () => ({ id: "proj-A", name: "Project Alpha" }),
    listAttention: async () => [{ id: "att-1", severity: "high", reason: "Test failure" }],
    listRuns: async () => [{ id: "run-1", status: "running" }],
    health: async () => ({ phase: "connected", transport: "socket" }),
    resolveAttention: async (id, decision) => ({ ok: true, id, decision })
  };

  const mockRuntimeB = {
    inspectProject: async () => ({ id: "proj-B", name: "Project Beta" }),
    listAttention: async () => [{ id: "att-2", severity: "critical", reason: "Production gate blocker" }],
    listRuns: async () => [],
    health: async () => ({ phase: "connected", transport: "socket" }),
    resolveAttention: async (id, decision) => ({ ok: true, id, decision })
  };

  const supervisor = new MaestroSupervisor({ maxGlobalConcurrentRuns: 10 });
  supervisor.registerProjectRuntime("proj-A", mockRuntimeA);
  supervisor.registerProjectRuntime("proj-B", mockRuntimeB);

  // List projects
  const projects = await supervisor.listProjects();
  assert.strictEqual(projects.length, 2);
  assert.strictEqual(projects[0].id, "proj-A");
  assert.strictEqual(projects[1].id, "proj-B");

  // Aggregate attention: critical first, then high
  const attention = await supervisor.aggregateAttention();
  assert.strictEqual(attention.length, 2);
  assert.strictEqual(attention[0].id, "att-2");
  assert.strictEqual(attention[0].severity, "critical");
  assert.strictEqual(attention[1].id, "att-1");
  assert.strictEqual(attention[1].severity, "high");

  // Aggregate health
  const health = await supervisor.aggregateHealth();
  assert.strictEqual(health.status, "healthy");
  assert.strictEqual(health.projectsCount, 2);
  assert.strictEqual(health.activeRuns, 1);
  assert.strictEqual(health.capacityAvailable, 9);

  // Resolve attention
  const resolved = await supervisor.resolveAttention("proj-B", "att-2", "approved");
  assert.strictEqual(resolved.ok, true);
  assert.strictEqual(resolved.decision, "approved");

  supervisor.close();
});
