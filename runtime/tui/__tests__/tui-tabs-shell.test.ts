import test from "node:test";
import assert from "node:assert/strict";
import { createTuiStore } from "../state/store.ts";
import { initialTabsState, tabsReducer, visibleTabCount } from "../state/tabs.ts";
import { tabStatus, tabBarModel } from "../shell/tabs-status.ts";
import { openSwitcher, updateQuery, confirm, overflowModel } from "../shell/project-switcher.ts";
import { normalizeEvent } from "../state/events.ts";

test("T2 tabs preservam cockpit, pin e ativação é somente view state", () => {
  let tabs = initialTabsState();
  tabs = tabsReducer(tabs, { source: "user-action", type: "tab.open", payload: { id: "p1", projectId: "p1", kind: "project" } });
  tabs = tabsReducer(tabs, { source: "user-action", type: "tab.activate", payload: { id: "p1" } });
  assert.equal(tabs.activeId, "p1");
  tabs = tabsReducer(tabs, { source: "user-action", type: "tab.pin", payload: { id: "p1" } });
  assert.strictEqual(tabsReducer(tabs, { source: "user-action", type: "tab.close", payload: { id: "p1", overflow: true } }), tabs);
  assert.strictEqual(tabsReducer(tabs, { source: "user-action", type: "tab.close", payload: { id: "cockpit" } }), tabs);
  assert.ok(visibleTabCount(70) >= 2);
});

test("T2 status prioriza failed > attention > verifying > running > idle", () => {
  const store = createTuiStore();
  const dispatch = (type: string, payload: Record<string, unknown>, seq: number) => store.dispatch({ source: "runtime-event", family: type.split(".")[0], type, epoch: "e", seq, timestamp: "t", payload });
  dispatch("agent.active", { id: "a1", projectId: "p1", status: "active" }, 1);
  assert.equal(tabStatus(store.getState(), "p1").kind, "running");
  dispatch("attention.created", { id: "x", projectId: "p1", status: "pending" }, 2);
  assert.equal(tabStatus(store.getState(), "p1").kind, "attention");
  dispatch("verification.completed", { id: "v", projectId: "p1", status: "failed" }, 3);
  assert.equal(tabStatus(store.getState(), "p1").kind, "failed");
});

test("T2 normalizes real agent and verification events into project tab status", () => {
  const store = createTuiStore();
  const event = (type: string, seq: number, data: Record<string, unknown>) => store.dispatch(normalizeEvent({ version: 2, epoch: 1, seq, type, timestamp: new Date().toISOString(), projectId: "p1", payload: { data } }));
  event("agentSession.active", 1, { terminalId: "terminal-a", pid: 1234 });
  assert.equal(tabStatus(store.getState(), "p1").kind, "running");
  event("task.verifying", 2, { taskId: "task-a", status: "verifying" });
  assert.equal(tabStatus(store.getState(), "p1").kind, "verifying");
});

test("T2 switcher filtra, confirma e overflow conserva todas as entradas", () => {
  const projects = [{ id: "p1", name: "Orquestrador" }, { id: "p2", name: "Website" }, { id: "p3", name: "API" }];
  const opened = openSwitcher(projects);
  const filtered = updateQuery(opened, "web");
  assert.deepEqual(filtered.entries.map((entry) => entry.id), ["p2"]);
  assert.deepEqual(confirm(filtered, "p1").map((action) => action.type), ["tab.activate", "ui.palette.close"]);
  const model = overflowModel(projects, 2);
  assert.equal(model.visible.length + model.hidden.length, projects.length);
  assert.equal(model.marker, "» +1");
  assert.ok(tabBarModel({ ...createTuiStore().getState(), tabs: initialTabsState() }, 70));
});
