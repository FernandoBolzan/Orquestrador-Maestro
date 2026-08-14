"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { SemanticPlanner } = require("../runtime/planner/semantic-planner");
const { GraphValidator } = require("../runtime/planner/graph-validator");
const { createTaskGraphProposal, createSemanticTask } = require("../runtime/planner/task-graph-proposal");
const { LaneExecutor } = require("../runtime/planner/lane-executor");

test("Main Acceptance Scenario: CRUD generates cohesive engineering tasks", async () => {
  const missionBrief = {
    id: "brief-1",
    objective: "Criar CRUD de produtos",
    requirements: ["cadastro", "edição", "consulta", "exclusão", "validação"]
  };

  const context = {
    items: [
      { key: "backend.framework", value: "Node.js", kind: "FACT" },
      { key: "database.type", value: "postgresql", kind: "FACT" },
      { key: "architecture", value: "controller-service-repository", kind: "FACT" }
    ]
  };

  const app = { providers: { get: () => null } };
  const planner = new SemanticPlanner({
    application: app,
    plannerTarget: { providerId: "opencode", model: "local", local: true }
  });
  const res = await planner.plan({ missionBrief, missionId: "brief-1", taskRelevantContext: context });

  assert.equal(res.taskGraph.tasks.length >= 3, true);
  assert.ok(res.taskGraph.tasks.some((t) => t.description.toLowerCase().includes("persistence")));
  assert.ok(res.taskGraph.tasks.some((t) => t.description.toLowerCase().includes("api")));
  assert.ok(res.taskGraph.tasks.some((t) => t.description.toLowerCase().includes("test")));
});

test("Acceptance Scenario: Backend-only context blocks frontend task proposal", () => {
  const proposal = createTaskGraphProposal({
    tasks: [createSemanticTask({ id: "t1", title: "Create React form", objective: "UI form", requiredCapabilities: ["frontend"] })]
  });
  const context = { items: [{ key: "project.frontend", value: null, kind: "FACT" }] };
  const res = GraphValidator.validate(proposal, { taskRelevantContext: context });
  assert.equal(res.valid, false);
  assert.ok(res.blockers.some((b) => b.code === "CONTEXT_FACT_CONTRADICTION"));
});

test("Acceptance Scenario: MongoDB context blocks SQL migration proposal", () => {
  const proposal = createTaskGraphProposal({
    tasks: [createSemanticTask({ id: "t1", title: "Run SQL migration", objective: "knex migration" })]
  });
  const context = { items: [{ key: "database.type", value: "mongodb", kind: "FACT" }] };
  const res = GraphValidator.validate(proposal, { taskRelevantContext: context });
  assert.equal(res.valid, false);
  assert.ok(res.blockers.some((b) => b.code === "DATABASE_CONTRADICTION"));
});

test("Acceptance Scenario: Cyclic proposal is rejected and NEVER reaches LaneExecutor", async () => {
  const proposal = createTaskGraphProposal({
    tasks: [
      createSemanticTask({ id: "a", title: "Task A", objective: "Do A", dependsOn: ["b"] }),
      createSemanticTask({ id: "b", title: "Task B", objective: "Do B", dependsOn: ["a"] })
    ]
  });

  const validation = GraphValidator.validate(proposal);
  assert.equal(validation.valid, false);

  let executorCallCount = 0;
  const fakeApp = {
    executeRun: async () => { executorCallCount++; }
  };
  const executor = new LaneExecutor({ application: fakeApp });

  if (validation.valid) {
    await executor.execute(validation.normalizedProposal.tasks, "mission-1");
  }

  assert.equal(executorCallCount, 0, "LaneExecutor must never be called on invalid graph");
});
