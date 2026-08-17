import test from "node:test";
import assert from "node:assert/strict";
import { WorkspaceManager } from "../workspace/workspace-manager.ts";
import type { Window } from "../windows/contract.ts";

const agent: Window = { id: "agent", type: "agent-terminal", title: "Agent", projectId: "p", context: "task", geometry: { x: 0, y: 0, width: 30, height: 10 }, state: { focused: false, maximized: false, minimized: false }, zOrder: 0 };

test("T3.7 manager compõe placement, foco, layout e dispatch restrito", () => {
  const actions: unknown[] = [];
  const manager = new WorkspaceManager({ projectId: "p", viewport: { width: 110, height: 30 }, dispatch: (action) => actions.push(action) });
  manager.openWindow(agent, "agent");
  assert.equal(manager.debugSnapshot().windows[0]?.state.focused, true);
  manager.applyLayoutMode("TILED");
  assert.deepEqual(manager.debugSnapshot().windows.map((item) => item.id), ["agent"]);
  assert.ok(actions.every((action) => (action as { type: string }).type.startsWith("workspace.window.")));
  assert.throws(() => new WorkspaceManager({ projectId: "p", viewport: { width: 69, height: 30 } }).applyLayoutMode("FLOATING"), /FLOATING_NOT_AVAILABLE/);
});

test("T3.7 preset e restore reconstituem workspace sem runtime IO", () => {
  const manager = new WorkspaceManager({ projectId: "p", viewport: { width: 150, height: 40 } });
  manager.applyPreset("Build");
  const saved = manager.debugSnapshot();
  manager.closeWindow(saved.windows[0]!.id);
  manager.restoreWorkspace(saved);
  assert.deepEqual(manager.debugSnapshot(), saved);
});
