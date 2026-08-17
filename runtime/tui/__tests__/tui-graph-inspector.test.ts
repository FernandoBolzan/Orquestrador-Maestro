import test from "node:test";
import assert from "node:assert/strict";
import { compactProjection, treeProjection, lanesProjection, wavesProjection } from "../views/graph-projections.ts";
import { selectTask, back, moveDeps, moveDependents, selectionForInspector } from "../views/graph-selection.ts";
import { inspectorModel } from "../views/inspector-model.ts";
import { formatDuration, formatInspectorSections, timelineFromEvents } from "../views/inspector-format.ts";

const graph = {
  id: "g1", missionId: "m1", dependencies: { a: [], b: ["a"], c: ["b"], d: ["c"], invalid: ["missing"] },
  tasks: [
    { id: "a", title: "A", status: "completed", capability: "backend" },
    { id: "b", title: "B", status: "running", capability: "frontend", provider: "codex", model: "gpt", pid: 12 },
    { id: "c", title: "C", status: "ready", capability: "testing" },
    { id: "d", title: "D", status: "blocked", capability: "testing" },
    { id: "invalid", title: "Invalid", status: "failed" }
  ]
};

test("T5 projeta compact/tree/lanes e quatro waves sem duplicar", () => {
  assert.deepEqual(compactProjection(graph).slice(0, 2).map((task) => task.id), ["b", "c"]);
  assert.equal(wavesProjection(graph).filter((wave) => wave.valid).length, 4);
  assert.ok(wavesProjection(graph).some((wave) => wave.tasks.some((task) => task.status === "invalid-dep")));
  assert.equal(new Set(lanesProjection(graph, "capability").flatMap((lane) => lane.tasks.map((task) => task.id))).size, graph.tasks.length);
  assert.ok(treeProjection(graph).length > 0);
});

test("T5 seleção navega dependências, dependentes e histórico", () => {
  let state = selectTask({ selectedTaskId: "c", focusProjectId: "p", focusMissionId: "m1", history: [] }, "d");
  assert.equal(moveDeps(state, graph).selectedTaskId, "c");
  assert.equal(moveDependents({ ...state, selectedTaskId: "b" }, graph).selectedTaskId, "c");
  assert.equal(back(state).selectedTaskId, "c");
  assert.deepEqual(Object.keys(selectionForInspector(state, graph)).sort(), ["graphId", "missionId", "task"]);
});

test("T7 inspector mantém 22 campos e N/A honesto", () => {
  const poor = inspectorModel({}, { task: graph.tasks[0] });
  assert.equal(poor.length, 22);
  assert.equal(poor.find((field) => field.key === "provider")?.value, "N/A");
  const complete = inspectorModel({}, { task: graph.tasks[1] });
  assert.equal(complete.find((field) => field.key === "provider")?.value, "codex");
  assert.deepEqual(formatInspectorSections(complete).map((section) => section.id), ["summary", "execution", "evidence", "timeline"]);
  assert.equal(formatDuration(252000), "04:12");
  assert.equal(timelineFromEvents({ id: "b" }, []).length, 0);
});
