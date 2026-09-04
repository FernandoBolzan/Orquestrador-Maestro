import type { LayoutMode, PresetId, Viewport, Window, WorkspaceView } from "../windows/contract.ts";
import { move, resize, tierFor } from "../windows/geometry.ts";
import { focusWindow } from "../windows/focus.ts";
import { closeView } from "../windows/lifecycle.ts";
import { autoPlace, floatingEnabled, tiledSplit } from "../windows/placement.ts";
import { applyPreset as buildPreset } from "../windows/presets.ts";

type Dispatch = (action: Readonly<{ source: "user-action"; type: string; payload: Record<string, unknown> }>) => unknown;
type Options = Readonly<{ projectId: string; viewport: Viewport; dispatch?: Dispatch }>;
export class WorkspaceManager {
  #workspace: WorkspaceView;
  #dispatch?: Dispatch;
  constructor(options: Options) { this.#workspace = Object.freeze({ projectId: options.projectId, windows: Object.freeze([]), layoutMode: "AUTO", preset: "Custom", viewport: Object.freeze({ ...options.viewport }) }); this.#dispatch = options.dispatch; }
  #emit(operation: string): void { this.#dispatch?.({ source: "user-action", type: `workspace.window.${operation}`, payload: { projectId: this.#workspace.projectId } }); }
  #set(windows: readonly Window[], extra: Partial<WorkspaceView> = {}): WorkspaceView { this.#workspace = Object.freeze({ ...this.#workspace, ...extra, windows: Object.freeze(windows.map((item) => Object.freeze({ ...item, geometry: Object.freeze({ ...item.geometry }), state: Object.freeze({ ...item.state }) }))) }); return this.#workspace; }
  openWindow(window: Window, kind: "agent" | "inspect" | "plan" | "attention-critical" = "plan"): WorkspaceView { const placed = autoPlace(this.#workspace.windows, { kind, window }, this.#workspace.viewport); this.#emit("open"); return this.#set(focusWindow(placed, window.id)); }
  closeWindow(windowId: string): WorkspaceView { this.#emit("close"); return this.#set(closeView(this.#workspace.windows, windowId).windows); }
  focusWindow(windowId: string): WorkspaceView { this.#emit("focus"); return this.#set(focusWindow(this.#workspace.windows, windowId)); }
  moveWindow(windowId: string, dx: number, dy: number): WorkspaceView { this.#emit("move"); return this.#set(this.#workspace.windows.map((item) => item.id === windowId ? { ...item, geometry: move(item.geometry, dx, dy, this.#workspace.viewport) } : item)); }
  resizeWindow(windowId: string, dw: number, dh: number): WorkspaceView { this.#emit("resize"); return this.#set(this.#workspace.windows.map((item) => item.id === windowId ? { ...item, geometry: resize(item.geometry, dw, dh, this.#workspace.viewport) } : item)); }
  applyLayoutMode(mode: LayoutMode): WorkspaceView { if (mode === "FLOATING" && !floatingEnabled(tierFor(this.#workspace.viewport.width))) throw new Error("FLOATING_NOT_AVAILABLE"); this.#emit("layout"); const windows = mode === "TILED" ? tiledSplit(this.#workspace.windows, "vertical", this.#workspace.viewport) : this.#workspace.windows; return this.#set(windows, { layoutMode: mode }); }
  applyPreset(preset: PresetId): WorkspaceView { this.#emit("preset"); this.#workspace = buildPreset(this.#workspace, preset, this.#workspace.viewport); return this.#workspace; }
  restoreWorkspace(workspace: WorkspaceView): WorkspaceView { if (workspace.projectId !== this.#workspace.projectId) throw new Error("WORKSPACE_PROJECT_MISMATCH"); this.#emit("restore"); return this.#set(workspace.windows, { layoutMode: workspace.layoutMode, preset: workspace.preset, viewport: workspace.viewport }); }
  debugSnapshot(): WorkspaceView { return this.#workspace; }
}
