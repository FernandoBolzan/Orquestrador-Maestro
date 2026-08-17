import test from "node:test";
import assert from "node:assert/strict";
import {
  composeResponsiveLayout,
  focusGrammar,
  nextActionVisibility,
  resolveNextAction,
  type NextActionInput,
} from "../shell/layout-model.ts";
import { buildCockpitModel } from "../shell/cockpit-model.ts";
import { deriveTaskGraph, formatTaskGraphTree } from "../shell/taskgraph-model.ts";
import { tabStatus, formatTabLabel } from "../shell/tabs-status.ts";
import { renderCockpitView } from "../views/cockpit-view.ts";
import { renderProjectWorkspaceView } from "../views/project-workspace-view.ts";

test("INVARIANT 1: Cockpit is global overview and answers operational questions", () => {
  const model = buildCockpitModel({
    runtime: { connected: true },
    projects: [
      { id: "api", name: "Backend API", progress: 65, running: 2, ready: 1, blocked: 0, agents: 2, attention: 0, status: "running" },
      { id: "web", name: "Frontend Web", progress: 40, running: 1, ready: 2, blocked: 1, agents: 1, attention: 0, status: "running" },
      { id: "pay", name: "Payments", progress: 10, running: 0, ready: 0, blocked: 1, agents: 0, attention: 2, status: "blocked" },
    ],
    attention: [
      { id: "att-1", projectId: "pay", severity: "CRITICAL", title: "API credentials invalid" },
      { id: "att-2", projectId: "pay", severity: "HIGH", title: "Webhook retry failed" },
    ],
    activity: [
      { id: "act-1", projectId: "api", text: "Task 'db-migration' completed" },
      { id: "act-2", projectId: "web", text: "Agent 'claude' started test suite" },
    ],
  }, 140);

  assert.equal(model.scope, "global");
  assert.equal(model.execution.running, 3); // 2 from api + 1 from web
  assert.equal(model.execution.agents, 3);
  assert.equal(model.execution.blocked, 2); // 1 from web + 1 from pay
  assert.equal(model.attentionCount, 2);
  assert.equal(model.blockedProjects.length, 2);
  assert.deepEqual(model.blockedProjects.map((p) => p.id), ["web", "pay"]);
  assert.equal(model.needsAttentionProjects.length, 1);
  assert.equal(model.needsAttentionProjects[0]?.id, "pay");
  assert.equal(model.activity.length, 2);
});

test("INVARIANT 2: Attention pending does NOT automatically open attention detail", () => {
  const modelWithAttention = buildCockpitModel({
    runtime: { connected: true },
    projects: [{ id: "p1", name: "Project 1", running: 0, ready: 0, blocked: 1, agents: 0, attention: 3, status: "blocked" }],
    attention: [
      { id: "a1", projectId: "p1", severity: "CRITICAL", title: "Gate approval" },
      { id: "a2", projectId: "p1", severity: "HIGH", title: "Missing env secret" },
      { id: "a3", projectId: "p1", severity: "MEDIUM", title: "Review proposed DAG" },
    ],
  });

  assert.equal(modelWithAttention.attentionCount, 3);
  assert.equal(modelWithAttention.attentionDetailOpen, false, "attentionDetailOpen must stay false until explicit user action");
});

test("INVARIANT 3: Next action follows strict priority hierarchy and is omitted when absent", () => {
  // Empty input -> no next action, visibility false
  const emptyInput: NextActionInput = {
    criticalAttention: 0,
    humanGate: false,
    failures: 0,
    blocked: 0,
    verificationFailures: 0,
    running: 0,
    recommendations: 0,
    optionalActions: 0,
  };
  assert.equal(nextActionVisibility(emptyInput), false);
  assert.equal(resolveNextAction(emptyInput), null);

  // Priority 1: Critical attention
  const crit = resolveNextAction({ ...emptyInput, criticalAttention: 1, humanGate: true, failures: 2 });
  assert.equal(crit?.priority, 1);
  assert.equal(crit?.kind, "critical_attention");

  // Priority 2: Human gate
  const gate = resolveNextAction({ ...emptyInput, humanGate: true, failures: 2, blocked: 1 });
  assert.equal(gate?.priority, 2);
  assert.equal(gate?.kind, "human_gate");

  // Priority 3: Failure
  const fail = resolveNextAction({ ...emptyInput, failures: 1, blocked: 3, running: 2 });
  assert.equal(fail?.priority, 3);
  assert.equal(fail?.kind, "failure");

  // Priority 4: Blocked task
  const blocked = resolveNextAction({ ...emptyInput, blocked: 2, verificationFailures: 0, running: 1 });
  assert.equal(blocked?.priority, 4);
  assert.equal(blocked?.kind, "blocked_task");

  // Priority 5: Verification failure
  const verif = resolveNextAction({ ...emptyInput, verificationFailures: 1, running: 2 });
  assert.equal(verif?.priority, 5);
  assert.equal(verif?.kind, "verification_failure");

  // Priority 6: Active execution
  const active = resolveNextAction({ ...emptyInput, running: 1 });
  assert.equal(active?.priority, 6);
  assert.equal(active?.kind, "active_execution");

  // Priority 7: Recommendation
  const rec = resolveNextAction({ ...emptyInput, recommendations: 1, optionalActions: 2 });
  assert.equal(rec?.priority, 7);
  assert.equal(rec?.kind, "recommendation");

  // Priority 8: Optional actions
  const opt = resolveNextAction({ ...emptyInput, optionalActions: 1 });
  assert.equal(opt?.priority, 8);
  assert.equal(opt?.kind, "optional_action");
});

test("INVARIANT 4: TaskGraph represents parallelism, waves, lanes, dependencies and critical path", () => {
  const graph = deriveTaskGraph([
    { id: "t1", title: "spec analysis", status: "completed", lane: "planning", dependsOn: [] },
    { id: "t2", title: "backend schema", status: "running", lane: "backend", dependsOn: ["t1"] },
    { id: "t3", title: "frontend components", status: "running", lane: "frontend", dependsOn: ["t1"] },
    { id: "t4", title: "integration tests", status: "blocked", lane: "qa", dependsOn: ["t2", "t3"] },
    { id: "t5", title: "deployment check", status: "queued", lane: "ops", dependsOn: ["t4"] },
  ]);

  assert.equal(graph.waves.length, 4);
  assert.deepEqual(graph.waves[0]?.ids, ["t1"]);
  assert.deepEqual(graph.waves[1]?.ids, ["t2", "t3"]);
  assert.deepEqual(graph.waves[2]?.ids, ["t4"]);
  assert.deepEqual(graph.waves[3]?.ids, ["t5"]);

  // Parallel groups in Wave 2
  assert.deepEqual(graph.parallelGroups, [["t2", "t3"]]);

  // Blocked-by tracking
  const t4 = graph.tasks.find((t) => t.id === "t4");
  assert.deepEqual(t4?.blockedBy, ["t2", "t3"]);

  // Critical path
  assert.deepEqual(graph.criticalPath, ["t1", "t2", "t4", "t5"]);

  // Formatted tree representation
  const tree = formatTaskGraphTree(graph);
  assert.ok(tree.includes("Wave 2 · 2 tasks (parallel)"));
  assert.ok(tree.includes("backend schema"));
  assert.ok(tree.includes("frontend components"));
  assert.ok(tree.includes("waits t2, t3") || tree.includes("blocked by"));
});

test("INVARIANT 5: Project Tab status conveys rich operational state beyond color", () => {
  assert.equal(formatTabLabel("Backend API", { kind: "running", agentCount: 2, attentionCount: 0 }), "Backend API ●2");
  assert.equal(formatTabLabel("Frontend", { kind: "verifying", agentCount: 0, attentionCount: 0 }), "Frontend ◐");
  assert.equal(formatTabLabel("Payments", { kind: "attention", agentCount: 0, attentionCount: 1 }), "Payments ⚠1");
  assert.equal(formatTabLabel("Docs", { kind: "completed", agentCount: 0, attentionCount: 0 }), "Docs ✓");
  assert.equal(formatTabLabel("Database", { kind: "failed", agentCount: 0, attentionCount: 0 }), "Database ✕");
  assert.equal(formatTabLabel("Empty App", { kind: "idle", agentCount: 0, attentionCount: 0 }), "Empty App ○");
});

test("INVARIANT 6 & 13: Ultrawide (180x50) recomposes into multi-region developer cockpit", () => {
  const layout = composeResponsiveLayout({
    width: 180,
    height: 50,
    hasGraph: true,
    hasAgent: true,
    hasInspector: true,
    hasAttention: true,
  });

  assert.equal(layout.mode, "ultrawide");
  assert.ok(layout.regions.includes("primary"));
  assert.ok(layout.regions.includes("agents"));
  assert.ok(layout.regions.includes("attention"));
  assert.ok(layout.regions.includes("activity"));
  assert.ok(layout.regions.includes("runtimeHealth"));

  const model = buildCockpitModel({
    runtime: { connected: true },
    projects: [
      { id: "p1", name: "Core API", progress: 80, running: 2, ready: 1, blocked: 0, agents: 2, attention: 0, status: "running" },
      { id: "p2", name: "Web UI", progress: 45, running: 1, ready: 1, blocked: 0, agents: 1, attention: 0, status: "running" },
    ],
    attention: [{ id: "att-1", projectId: "p1", title: "Approve migration" }],
    activity: [{ id: "a1", text: "Build completed" }],
  }, 180);

  const rendered = renderCockpitView(model, 180);
  assert.ok(rendered.includes("PROJECTS & EXECUTION") || rendered.includes("PROJECTS"));
  assert.ok(rendered.includes("ACTIVE AGENTS & LANES") || rendered.includes("AGENTS"));
  assert.ok(rendered.includes("ATTENTION") || rendered.includes("INTERVENÇÃO"));
  assert.ok(rendered.includes("RECENT ACTIVITY") || rendered.includes("ACTIVITY"));
  assert.ok(rendered.includes("RUNTIME HEALTH") || rendered.includes("RUNTIME"));
});

test("INVARIANT 7 & 13: Project Workspace layout tiers (80x24, 140x40, 180x50)", () => {
  const compact = composeResponsiveLayout({ width: 80, height: 24, hasGraph: true, hasAgent: true, hasInspector: false, hasAttention: false });
  assert.equal(compact.mode, "compact");
  assert.deepEqual(compact.regions, ["primary"]);

  const wide = composeResponsiveLayout({ width: 140, height: 40, hasGraph: true, hasAgent: true, hasInspector: true, hasAttention: false });
  assert.equal(wide.mode, "wide");
  assert.ok(wide.regions.includes("primary"));
  assert.ok(wide.regions.includes("secondary"));

  const ultrawide = composeResponsiveLayout({ width: 180, height: 50, hasGraph: true, hasAgent: true, hasInspector: true, hasAttention: false });
  assert.equal(ultrawide.mode, "ultrawide");
  assert.ok(ultrawide.regions.includes("primary"));
  assert.ok(ultrawide.regions.includes("secondary"));
  assert.ok(ultrawide.regions.includes("tertiary"));
});

test("INVARIANT 9: Honest empty states", () => {
  const emptyCockpit = buildCockpitModel({
    runtime: { connected: true },
    projects: [],
    attention: [],
    activity: [],
  }, 120);
  const renderedEmpty = renderCockpitView(emptyCockpit, 120);
  assert.ok(renderedEmpty.includes("Nenhum projeto registrado.") || renderedEmpty.includes("No projects registered."));
  assert.ok(renderedEmpty.includes("Nenhuma intervenção pendente."));

  const emptyGraph = deriveTaskGraph([]);
  const renderedGraph = renderProjectWorkspaceView({
    project: { id: "p1", name: "Demo", status: "idle" },
    graph: emptyGraph,
    sessions: [],
    width: 120,
    height: 36,
  });
  assert.ok(renderedGraph.includes("No active TaskGraph"));
});

test("INVARIANT 10: Rich Focus Grammar with visual dimensions beyond color", () => {
  const activeTab = focusGrammar({ entityType: "tab", active: true, focused: true, attention: false, running: false });
  assert.equal(activeTab.marker, "◆");
  assert.equal(activeTab.border, "double");
  assert.equal(activeTab.weight, "bold");

  const focusedWindow = focusGrammar({ entityType: "window", focused: true, selected: true, attention: false, running: false });
  assert.equal(focusedWindow.marker, "▸");
  assert.equal(focusedWindow.border, "single-bold");

  const attentionItem = focusGrammar({ entityType: "task", attention: true, focused: false, selected: false, running: false });
  assert.equal(attentionItem.marker, "⚠");
  assert.equal(attentionItem.border, "heavy");

  const backgroundRunning = focusGrammar({ entityType: "task", running: true, attention: false, focused: false, selected: false });
  assert.equal(backgroundRunning.marker, "●");
  assert.equal(backgroundRunning.emphasis, "background");
});
