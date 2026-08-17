import test from "node:test";
import assert from "node:assert/strict";
import { createTuiStore } from "../state/store.ts";
import { cockpitModel } from "../views/cockpit-model.ts";
import { formatProgress, projectSummaryRow, truncate } from "../views/cockpit-rows.ts";

test("T4 cockpit tem cinco seções canônicas e estado vazio honesto", () => {
  const state = createTuiStore().getState();
  const model = cockpitModel(state);
  assert.deepEqual(model.map((section) => section.id), ["cockpit", "global-attention", "recent-activity", "execution-overview", "runtime-health"]);
  assert.ok(model.every((section) => section.rows.length > 0));
});

test("T4 linha de projeto tem sete campos exatos e progresso seguro", () => {
  const store = createTuiStore();
  const emit = (family: string, type: string, payload: Record<string, unknown>, seq: number) => store.dispatch({ source: "runtime-event", family, type, epoch: "e", seq, timestamp: "t", payload });
  emit("project", "project.updated", { id: "p1", name: "Projeto extenso" }, 1);
  emit("task", "task.completed", { taskId: "t1", projectId: "p1", missionId: "m1", status: "completed" }, 2);
  emit("task", "task.started", { taskId: "t2", projectId: "p1", missionId: "m1", status: "running" }, 3);
  const row = projectSummaryRow(store.getState(), "p1");
  assert.equal(row.fields.length, 7);
  assert.equal(formatProgress(1, 2), "1/2 · 50%");
  assert.equal(formatProgress(0, 0), "—");
  assert.ok(truncate("uma frase longa demais", 12).length <= 12);
  assert.equal(row.fields[6], "N/A");
});
