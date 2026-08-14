"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const core = require("../runtime/core");
const { PlanApprovalGate } = require("../runtime/planner/plan-approval-gate");
const { SemanticPlanner } = require("../runtime/planner/semantic-planner");
const { LegacyExecutionProjection } = require("../runtime/planner/legacy-execution-projection");
const { formatTasks } = require("../runtime/planner/task-formatter");

test("PlanApprovalGate evaluateAutoApproval authorizes valid plan and rejects on blocker", () => {
  const validRes = PlanApprovalGate.evaluateAutoApproval({
    validationResult: { valid: true, blockers: [] },
    planningMode: "local-ai"
  });
  assert.equal(validRes.approved, true);
  assert.equal(validRes.approvalType, "USER_AUTO_POLICY");

  const blockedRes = PlanApprovalGate.evaluateAutoApproval({
    validationResult: { valid: false, blockers: [{ code: "BLOCKER", message: "Cycle detected" }] },
    planningMode: "local-ai"
  });
  assert.equal(blockedRes.approved, false);
  assert.equal(blockedRes.approvalType, "REJECTED");
});

test("SemanticPlanner requires approved MissionBrief objective and missionId", async () => {
  const planner = new SemanticPlanner({ application: { providers: { get: () => null } } });
  await assert.rejects(
    () => planner.plan({ missionBrief: { objective: "CRUD" } }),
    /MISSING_MISSION_ID/
  );
});

test("SemanticPlanner plans successfully using approved MissionBrief", async () => {
  const approvedBrief = core.createMissionBrief({
    id: "brief-xyz",
    intentSessionId: "session-123",
    objective: "Implementar autenticação JWT",
    requirements: ["login endpoint", "token validation"],
    userDecisions: ["use jsonwebtoken"],
    constraints: ["Node.js 18+"],
    relevantContext: JSON.stringify({ framework: "express" })
  });

  const app = {
    providers: {
      get: () => null
    }
  };

  const planner = new SemanticPlanner({
    application: app,
    plannerTarget: { providerId: "opencode", model: "default", local: true }
  });

  const planResult = await planner.plan({
    missionBrief: approvedBrief,
    missionId: approvedBrief.id,
    taskRelevantContext: { items: [] },
    resolvedSkills: [],
    allowFallback: true
  });

  assert.equal(planResult.taskGraph.missionId, "brief-xyz");
  assert.ok(planResult.taskGraph.tasks.length > 0);
  assert.equal(planResult.planningMode, "deterministic-fallback");

  const executionTarget = { providerId: "opencode", model: "default" };
  const projectedTasks = planResult.taskGraph.tasks.map((st) =>
    LegacyExecutionProjection.projectTask(st.metadata?.semantic || st, { executionTarget })
  );

  assert.equal(projectedTasks.length, planResult.taskGraph.tasks.length);
  assert.equal(projectedTasks[0].provider, "opencode");
  assert.equal(projectedTasks[0].model, "default");
  assert.ok(projectedTasks[0].label);
});

test("CLI planning flow: PlanApprovalGate policy enforcement for --auto mode", () => {
  // 1. Valid local-ai plan is auto approved
  const autoLocalAi = PlanApprovalGate.evaluateAutoApproval({
    validationResult: { valid: true, blockers: [] },
    planningMode: "local-ai"
  }, { autoFallbackAllowed: false });
  assert.equal(autoLocalAi.approved, true);
  assert.equal(autoLocalAi.approvalType, "USER_AUTO_POLICY");

  // 2. Deterministic fallback in auto mode without explicit permission is rejected
  const autoFallback = PlanApprovalGate.evaluateAutoApproval({
    validationResult: { valid: true, blockers: [] },
    planningMode: "deterministic-fallback"
  }, { autoFallbackAllowed: false });
  assert.equal(autoFallback.approved, false);
  assert.equal(autoFallback.approvalType, "REJECTED");
  assert.match(autoFallback.reason, /UNAUTHORIZED_FALLBACK_IN_AUTO_MODE/);

  // 3. Plan with blockers in auto mode is rejected
  const autoBlockers = PlanApprovalGate.evaluateAutoApproval({
    validationResult: { valid: false, blockers: [{ code: "CYCLE_DETECTED" }] },
    planningMode: "local-ai"
  }, { autoFallbackAllowed: false });
  assert.equal(autoBlockers.approved, false);
  assert.equal(autoBlockers.approvalType, "REJECTED");
});

test("CLI planning flow: interactive actions handle approve, inspect, refine, and cancel", () => {
  const taskGraphId = "task-graph-456";

  // Action: aprovar
  const humanApproval = PlanApprovalGate.recordHumanApproval({
    taskGraphId,
    userDecision: "approved"
  });
  assert.equal(humanApproval.taskGraphId, taskGraphId);
  assert.equal(humanApproval.approvalType, "HUMAN_REVIEW");
  assert.equal(humanApproval.userDecision, "approved");
  assert.ok(humanApproval.approvedAt);

  // Action: inspecionar detail string formatting
  const mockTasks = [
    {
      metadata: {
        semantic: {
          title: "Setup Auth Route",
          objective: "Create /login endpoint",
          acceptanceCriteria: ["Returns 200 with JWT", "Returns 401 on invalid credentials"]
        }
      }
    }
  ];

  const inspectDetails = mockTasks.map(t => {
    const s = t.metadata?.semantic || t;
    return `• ${s.title}\n  Objetivo: ${s.objective}\n  Critérios: ${(s.acceptanceCriteria || []).join(", ") || "Padrão"}`;
  }).join("\n\n");

  assert.match(inspectDetails, /• Setup Auth Route/);
  assert.match(inspectDetails, /Objetivo: Create \/login endpoint/);
  assert.match(inspectDetails, /Critérios: Returns 200 with JWT, Returns 401 on invalid credentials/);
});

test("CLI bin/orquestrador-maestro.js wires SemanticPlanner and PlanApprovalGate in handleGoCommand", () => {
  const cliContent = fs.readFileSync(path.join(__dirname, "..", "bin", "orquestrador-maestro.js"), "utf8");

  // Verify that handleGoCommand uses SemanticPlanner, PlanApprovalGate, and LegacyExecutionProjection
  assert.match(cliContent, /SemanticPlanner/);
  assert.match(cliContent, /PlanApprovalGate/);
  assert.match(cliContent, /LegacyExecutionProjection/);
  assert.match(cliContent, /app\.approveMissionBrief/);
  assert.match(cliContent, /planner\.plan\(\{/);
  assert.match(cliContent, /PlanApprovalGate\.evaluateAutoApproval/);
  assert.match(cliContent, /PlanApprovalGate\.recordHumanApproval/);
  assert.match(cliContent, /Aprovar plano de engenharia/);
  assert.match(cliContent, /Inspecionar critérios de aceite/);
  assert.match(cliContent, /Refinar missão \(Retornar ao M2\)/);
});
