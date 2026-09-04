import test from "node:test";
import assert from "node:assert/strict";
import { applyPreset, presetLayout } from "../windows/presets.ts";
import type { Window, WorkspaceView } from "../windows/contract.ts";

test("T3.5 presets têm projectId, ids e zOrder únicos", () => {
  for (const preset of ["Overview", "Build", "Debug", "Review", "Terminal"] as const) {
    const windows = presetLayout(preset, "WIDE", "project-a", { width: 150, height: 40 });
    assert.ok(windows.every((item) => item.projectId === "project-a"));
    assert.equal(new Set(windows.map((item) => item.id)).size, windows.length);
    assert.equal(new Set(windows.map((item) => item.zOrder)).size, windows.length);
  }
  assert.ok(presetLayout("Debug", "WIDE", "p", { width: 150, height: 40 }).some((item) => item.type === "attention"));
});

test("T3.5 Custom restaura geometria 1:1", () => {
  const custom: Window = { id: "custom", type: "skills", title: "Skills", projectId: "p", context: "skills", geometry: { x: 7, y: 4, width: 33, height: 15 }, state: { focused: true, maximized: false, minimized: false }, zOrder: 0 };
  const workspace: WorkspaceView = { projectId: "p", windows: [custom], layoutMode: "AUTO", preset: "Custom", viewport: { width: 100, height: 30 } };
  assert.deepEqual(applyPreset(workspace, "Custom", workspace.viewport).windows, [custom]);
});
