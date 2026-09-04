import type { PresetId, Tier, Viewport, Window, WindowType, WorkspaceView } from "./contract.ts";
import { tiledSplit } from "./placement.ts";

const TYPES: Readonly<Record<Exclude<PresetId, "Custom">, readonly WindowType[]>> = Object.freeze({ Overview: ["plan", "cockpit"], Build: ["plan", "agent-terminal", "inspector"], Debug: ["plan", "agent-terminal", "inspector", "attention"], Review: ["plan", "inspector", "attention"], Terminal: ["agent-terminal", "plan"] });
export function presetLayout(preset: Exclude<PresetId, "Custom">, _tier: Tier, projectId: string, viewport: Viewport): Window[] {
  const windows = TYPES[preset].map((type, index): Window => ({ id: `${projectId}:${preset.toLowerCase()}:${type}:${index}`, type, title: `${type.toUpperCase()} · ${projectId}`, projectId, context: preset, geometry: { x: 0, y: 0, width: viewport.width, height: viewport.height }, state: { focused: index === 0, maximized: false, minimized: false }, zOrder: index }));
  return tiledSplit(windows, "vertical", viewport);
}
export function applyPreset(workspace: WorkspaceView, preset: PresetId, viewport: Viewport): WorkspaceView {
  if (preset === "Custom") return Object.freeze({ ...workspace, viewport: Object.freeze({ ...viewport }), windows: workspace.windows.map((item) => Object.freeze({ ...item })) });
  const tier: Tier = viewport.width < 70 ? "COMPACT" : viewport.width < 140 ? "NORMAL" : viewport.width < 180 ? "WIDE" : "ULTRAWIDE";
  return Object.freeze({ ...workspace, preset, viewport: Object.freeze({ ...viewport }), windows: Object.freeze(presetLayout(preset, tier, workspace.projectId, viewport)) });
}
