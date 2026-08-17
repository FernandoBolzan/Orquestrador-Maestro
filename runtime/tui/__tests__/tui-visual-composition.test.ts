import test from "node:test";
import assert from "node:assert/strict";
import { composeResponsiveLayout, focusGrammar, nextActionVisibility } from "../shell/layout-model.ts";
import { buildCockpitModel } from "../shell/cockpit-model.ts";
import { deriveTaskGraph } from "../shell/taskgraph-model.ts";

test("responsive layout recomposes by terminal tier instead of stretching one panel", () => {
  const compact = composeResponsiveLayout({ width: 80, height: 24, hasGraph: true, hasAgent: true, hasInspector: true, hasAttention: false });
  const wide = composeResponsiveLayout({ width: 140, height: 40, hasGraph: true, hasAgent: true, hasInspector: true, hasAttention: false });
  const ultrawide = composeResponsiveLayout({ width: 180, height: 50, hasGraph: true, hasAgent: true, hasInspector: true, hasAttention: true });
  assert.equal(compact.mode, "compact");
  assert.deepEqual(compact.regions, ["primary"]);
  assert.deepEqual(wide.regions, ["primary", "secondary", "tertiary"]);
  assert.ok(ultrawide.regions.includes("agents"));
  assert.ok(ultrawide.regions.includes("attention"));
  assert.ok(ultrawide.regions.length > wide.regions.length);
});

test("next action is absent unless an actionable condition exists", () => {
  assert.equal(nextActionVisibility({ attention: 0, humanGate: false, failures: 0, blocked: 0, verificationFailures: 0, running: 0, recommendations: 0 }), false);
  assert.equal(nextActionVisibility({ attention: 1, humanGate: false, failures: 0, blocked: 0, verificationFailures: 0, running: 0, recommendations: 0 }), true);
});

test("focus grammar distinguishes selection, focus, attention and background execution", () => {
  assert.deepEqual(focusGrammar({ selected: true, focused: true, attention: false, running: false }), { marker: "▸", border: "single-bold", weight: "bold", label: "selected", emphasis: "focused" });
  assert.deepEqual(focusGrammar({ selected: false, focused: false, attention: true, running: false }), { marker: "⚠", border: "heavy", weight: "bold", label: "attention", emphasis: "alert" });
  assert.deepEqual(focusGrammar({ selected: false, focused: false, attention: false, running: true }), { marker: "●", border: "single-muted", weight: "normal", label: "running", emphasis: "background" });
});

test("cockpit remains global and exposes project operations without opening attention detail", () => {
  const model = buildCockpitModel({
    runtime: { connected: true },
    projects: [
      { id: "a", name: "Backend API", progress: 72, running: 2, ready: 1, blocked: 0, agents: 2, attention: 0, status: "running" },
      { id: "b", name: "Payments", progress: 45, running: 0, ready: 0, blocked: 1, agents: 0, attention: 1, status: "attention" },
      { id: "c", name: "Docs", progress: 100, running: 0, ready: 0, blocked: 0, agents: 0, attention: 0, status: "completed" },
    ],
    attention: [{ id: "gate-1", projectId: "b", title: "Migration approval", severity: "CRITICAL", reason: "Decision required" }],
    activity: [{ id: "e1", projectId: "a", text: "task-api started" }],
  }, 140);
  assert.equal(model.scope, "global");
  assert.equal(model.attentionCount, 1);
  assert.equal(model.attentionDetailOpen, false);
  assert.equal(model.projects.find((entry) => entry.id === "b")?.attentionCount, 1);
  assert.equal(model.execution.running, 2);
  assert.ok(model.activity.length > 0);
});

test("task graph derives parallel groups and blocked-by relationships from real dependencies", () => {
  const graph = deriveTaskGraph([
    { id: "a", title: "analyze", status: "completed", dependsOn: [] },
    { id: "b", title: "backend", status: "running", dependsOn: ["a"] },
    { id: "c", title: "frontend", status: "running", dependsOn: ["a"] },
    { id: "d", title: "integration", status: "blocked", dependsOn: ["b", "c"] },
  ]);
  assert.deepEqual(graph.waves.map((wave) => wave.ids), [["a"], ["b", "c"], ["d"]]);
  assert.deepEqual(graph.parallelGroups, [["b", "c"]]);
  assert.deepEqual(graph.tasks.find((task) => task.id === "d")?.blockedBy, ["b", "c"]);
  assert.deepEqual(graph.nextRunnable, []);
});
