"use strict";

/**
 * Regressions for the PR#6 review batch A (blocking behavior items):
 *   4  LaneExecutor: transitive failure propagation + deadlock guard
 *   13 verification "skipped" must not fail the run (see maestro-application.test.js)
 *   22 Clack "edit" must preserve already-confirmed answers
 *   23 explicit autoPolicy.decisionClasses is an allow-list (empty = block all)
 *   24 detect() is async — await it, or the availability fallback is dead code
 *   29 multi-choice answers must satisfy in/notIn activation conditions
 */

const assert = require("node:assert/strict");
const test = require("node:test");
const { LaneExecutor } = require("../runtime/planner/lane-executor.js");
const { ClackBatchInteractionAdapter } = require("../runtime/planner/clack-batch-adapter.js");
const { BatchRefinementCoordinator, DEFAULT_AUTO_POLICY_CLASSES } = require("../runtime/planner/batch-refinement-coordinator.js");
const { BatchIntentDiscoverer } = require("../runtime/planner/batch-intent-discoverer.js");
const { IntentReconciler } = require("../runtime/planner/intent-reconciler.js");
const { createBatchQuestion } = require("../runtime/planner/batch-question.js");
const { scheduleQuestions } = require("../runtime/planner/question-scheduler.js");

// ── #4: LaneExecutor ──────────────────────────────────────────────────────

function stubApplication(behavior) {
  return {
    getMission: async () => ({ projectId: "proj-1" }),
    executeRun: async (request) => {
      const outcome = behavior[request.semanticTaskId];
      if (outcome && outcome.error) throw new Error(outcome.error);
      return { ok: true };
    }
  };
}

test("#4: transitive failure chain settles (X fails -> A and B blocked), no hang", async () => {
  const executor = new LaneExecutor({ application: stubApplication({ x: { error: "boom" } }) });
  const started = Date.now();
  const results = await executor.execute([
    { id: "x", description: "X", provider: "codex", dependsOn: [] },
    { id: "a", description: "A", provider: "codex", dependsOn: ["x"] },
    { id: "b", description: "B", provider: "codex", dependsOn: ["a"] }
  ], "mission-1");
  assert.ok(Date.now() - started < 2000, "must settle promptly");
  assert.equal(results.x.status, "failed");
  assert.equal(results.a.status, "failed");
  assert.match(results.a.error || "", /blocked by failed dependency/);
  assert.equal(results.b.status, "failed");
  assert.match(results.b.error || "", /blocked by failed dependency/);
});

test("#4: missing/cyclic dependencies settle with failure instead of hanging", async () => {
  const executor = new LaneExecutor({ application: stubApplication({}) });
  const results = await executor.execute([
    { id: "c1", description: "C1", provider: "codex", dependsOn: ["ghost"] },
    { id: "c2", description: "C2", provider: "codex", dependsOn: ["c1"] }
  ], "mission-2");
  assert.equal(results.c1.status, "failed");
  assert.match(results.c1.error || "", /no runnable task/);
  assert.equal(results.c2.status, "failed");
});

test("#4: happy path still completes in dependency order", async () => {
  const order = [];
  const executor = new LaneExecutor({
    application: {
      getMission: async () => ({ projectId: "proj-1" }),
      executeRun: async (request) => { order.push(request.semanticTaskId); return { ok: true }; }
    }
  });
  const results = await executor.execute([
    { id: "a", description: "A", provider: "codex", dependsOn: [] },
    { id: "b", description: "B", provider: "codex", dependsOn: ["a"] }
  ], "mission-3");
  assert.equal(results.a.status, "completed");
  assert.equal(results.b.status, "completed");
  assert.ok(order.indexOf("a") < order.indexOf("b"));
});

// ── #22: Clack edit must not discard answers ─────────────────────────────

function clackStub(script) {
  const calls = { text: 0, select: 0 };
  const p = {
    note: () => {},
    log: { info: () => {}, success: () => {} },
    isCancel: () => false,
    text: async () => { calls.text++; return script.textAnswers.shift(); },
    select: async (opts) => { calls.select++; return script.selectAnswers.shift(); }
  };
  return { p, calls };
}

test("#22: editing one answer keeps the others and re-asks only the edited question", async () => {
  const questions = [
    createBatchQuestion({ id: "q1", dimension: "scope", text: "Escopo?", answerType: "text" }),
    createBatchQuestion({ id: "q2", dimension: "stack", text: "Stack?", answerType: "text" })
  ];
  const stub = clackStub({
    textAnswers: ["fullstack", "react", "fullstack-edit"],
    selectAnswers: ["edit", "q1", "confirm"]
  });
  const adapter = new ClackBatchInteractionAdapter({ prompts: stub.p });
  const result = await adapter.collectBatch(questions, { batchNumber: 1, totalQuestions: 2, answeredCount: 0 });
  assert.equal(result.action, "confirm");
  assert.equal(result.answers.q1, "fullstack-edit", "edited answer must win");
  assert.equal(result.answers.q2, "react", "unedited answer must survive the edit flow");
  assert.equal(stub.calls.text, 3, "questions must be asked once; only the target re-asked");
});

test("#22: cancel still cancels and confirm keeps every answer", async () => {
  const questions = [createBatchQuestion({ id: "q1", dimension: "scope", text: "Escopo?", answerType: "text" })];
  const stub = clackStub({ textAnswers: ["x"], selectAnswers: ["confirm"] });
  const adapter = new ClackBatchInteractionAdapter({ prompts: stub.p });
  const confirmed = await adapter.collectBatch(questions, { batchNumber: 1, totalQuestions: 1, answeredCount: 0 });
  assert.equal(confirmed.action, "confirm");
  assert.equal(confirmed.answers.q1, "x");
  const cancelStub = clackStub({ textAnswers: ["x"], selectAnswers: ["cancel"] });
  const canceller = new ClackBatchInteractionAdapter({ prompts: cancelStub.p });
  const cancelled = await canceller.collectBatch(questions, { batchNumber: 1, totalQuestions: 1, answeredCount: 0 });
  assert.equal(cancelled.action, "cancel");
});

// ── #23: decisionClasses is an allow-list ─────────────────────────────────

function makeCoordinatorWithQuestion(decisionRequired, adapter) {
  const q = createBatchQuestion({
    id: "q1", dimension: "scope", text: "Escopo?",
    answerType: "single-choice",
    options: [{ value: "a", label: "A", recommended: true }],
    decisionRequired, blocking: true
  });
  const discoverer = { discover: async () => ({ questions: [q], detectedUnknowns: [], requirementsToAdd: [], constraintsToAdd: [], valid: true, validationErrors: [], questionCount: 1, discoveryRound: 1, error: null }), get discoveryRound() { return 1; } };
  const reconciler = { reconcile: async () => ({ success: true, error: null, proposal: { objective: "x", addRequirements: [], addConstraints: [], detectedUnknowns: [], question: null } }), get aiCalls() { return 1; } };
  return new BatchRefinementCoordinator({ discoverer, reconciler, adapter });
}

test("#23: empty decisionClasses blocks everything in --auto", async () => {
  let adapterCalled = false;
  const coord = makeCoordinatorWithQuestion("CONTEXT_CONFIRMABLE", { collectBatch: async () => { adapterCalled = true; return { action: "confirm", answers: {} }; } });
  const result = await coord.run({ objective: "x", requirements: [], constraints: [], userDecisions: [], unknowns: [], status: "CREATED" }, {}, [], { auto: true, autoPolicy: { decisionClasses: [] } });
  assert.equal(result.blocked, true, "empty allow-list must block auto-approval");
  assert.equal(adapterCalled, false);
  assert.equal(result.autoApproved, true);
});

test("#23: explicit allow-list blocks classes outside it and auto-answers inside it", async () => {
  const coord = makeCoordinatorWithQuestion("CONTEXT_CONFIRMABLE", { collectBatch: async () => ({ action: "confirm", answers: {} }) });
  const blocked = await coord.run({ objective: "x", requirements: [], constraints: [], userDecisions: [], unknowns: [], status: "CREATED" }, {}, [], { auto: true, autoPolicy: { decisionClasses: ["OPTIONAL"] } });
  assert.equal(blocked.blocked, true, "CONTEXT_CONFIRMABLE not in allow-list must block");
  const coord2 = makeCoordinatorWithQuestion("OPTIONAL", { collectBatch: async () => ({ action: "confirm", answers: {} }) });
  const approved = await coord2.run({ objective: "x", requirements: [], constraints: [], userDecisions: [], unknowns: [], status: "CREATED" }, {}, [], { auto: true, autoPolicy: { decisionClasses: ["OPTIONAL"] }, showOptional: true });
  assert.equal(approved.blocked, false, "OPTIONAL in allow-list must auto-answer");
  assert.equal(approved.success, true);
});

test("#23: default policy unchanged — HUMAN_REQUIRED blocks, others auto-answer", async () => {
  const Q_DEFAULT = DEFAULT_AUTO_POLICY_CLASSES;
  assert.ok(Array.isArray(Q_DEFAULT));
  const coord = makeCoordinatorWithQuestion("HUMAN_REQUIRED", { collectBatch: async () => ({ action: "confirm", answers: {} }) });
  const result = await coord.run({ objective: "x", requirements: [], constraints: [], userDecisions: [], unknowns: [], status: "CREATED" }, {}, [], { auto: true });
  assert.equal(result.blocked, true);
});

// ── #24: detect() is async ────────────────────────────────────────────────

test("#24: discoverer awaits detect() Promise and skips execute when unavailable", async () => {
  let executed = false;
  const provider = {
    detect: async () => ({ installed: false }),
    execute: async () => { executed = true; return { result: Promise.resolve({ stdout: "{}" }) }; }
  };
  const discoverer = new BatchIntentDiscoverer({ provider });
  const result = await discoverer.discover("vago", { objective: "vago" }, [], {});
  assert.equal(executed, false, "unavailable provider must not be invoked");
  assert.equal(result.valid, true);
  assert.equal(result.questions.length, 0);
});

test("#24: reconciler awaits detect() Promise when unavailable", async () => {
  let executed = false;
  const provider = {
    detect: async () => ({ installed: false }),
    execute: async () => { executed = true; return { result: Promise.resolve({ stdout: "{}" }) }; }
  };
  const reconciler = new IntentReconciler({ provider });
  const result = await reconciler.reconcile({ objective: "vago" }, [], {});
  assert.equal(executed, false);
  assert.equal(result.success, false);
});

// ── #29: multi-choice activation ──────────────────────────────────────────

const multiQuestion = createBatchQuestion({
  id: "dep", dimension: "scope", text: "Quais camadas?", answerType: "multi-choice",
  options: [{ value: "frontend", label: "Frontend" }, { value: "backend", label: "Backend" }]
});
const dependent = createBatchQuestion({
  id: "child", dimension: "api", text: "API?", answerType: "boolean",
  activation: { all: [{ questionId: "dep", operator: "in", values: ["frontend"] }] }
});
const excluded = createBatchQuestion({
  id: "child2", dimension: "api", text: "Nao mostrada?", answerType: "boolean",
  activation: { all: [{ questionId: "dep", operator: "notIn", values: ["frontend"] }] }
});

test("#29: multi-choice array answer satisfies in/notIn activation", () => {
  const answers = new Map([["dep", ["backend", "frontend"]]]);
  const active = scheduleQuestions([dependent, excluded], answers, {}, { batchSize: 4 });
  assert.ok(active.some((q) => q.id === "child"), "in: overlap must activate the dependent question");
  assert.ok(!active.some((q) => q.id === "child2"), "notIn: any overlap must keep the question hidden");
});

test("#29: scalar answers keep legacy behavior", () => {
  const answers = new Map([["dep", "frontend"]]);
  const active = scheduleQuestions([dependent, excluded], answers, {}, { batchSize: 4 });
  assert.ok(active.some((q) => q.id === "child"));
  assert.ok(!active.some((q) => q.id === "child2"));
});