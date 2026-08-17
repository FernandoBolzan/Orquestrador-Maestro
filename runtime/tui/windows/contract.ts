export const WINDOW_TYPES = ["cockpit", "plan", "inspector", "agent-terminal", "attention", "skills", "overlay"] as const;
export const LAYOUT_MODES = ["AUTO", "TILED", "FLOATING"] as const;
export const PRESET_IDS = ["Overview", "Build", "Debug", "Review", "Terminal", "Custom"] as const;
export const TIERS = ["COMPACT", "NORMAL", "WIDE", "ULTRAWIDE"] as const;

export type WindowType = typeof WINDOW_TYPES[number];
export type LayoutMode = typeof LAYOUT_MODES[number];
export type PresetId = typeof PRESET_IDS[number];
export type Tier = typeof TIERS[number];
export type Geometry = Readonly<{ x: number; y: number; width: number; height: number }>;
export type Viewport = Readonly<{ width: number; height: number }>;
export type WindowState = Readonly<{ focused: boolean; maximized: boolean; minimized: boolean; savedGeometry?: Geometry }>;
export type Window = Readonly<{ id: string; type: WindowType; title: string; projectId: string; context: string; geometry: Geometry; state: WindowState; zOrder: number }>;
export type WorkspaceView = Readonly<{ projectId: string; windows: readonly Window[]; layoutMode: LayoutMode; preset: PresetId; viewport: Viewport }>;

function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
export function isGeometry(value: unknown): value is Geometry {
  if (!record(value)) return false;
  return [value.x, value.y, value.width, value.height].every(Number.isInteger)
    && Number(value.x) >= 0 && Number(value.y) >= 0 && Number(value.width) > 0 && Number(value.height) > 0;
}
export function isWindow(value: unknown): value is Window {
  if (!record(value) || !WINDOW_TYPES.includes(value.type as WindowType)) return false;
  if (![value.id, value.title, value.projectId].every((item) => typeof item === "string" && item.length > 0)) return false;
  if (value.type !== "overlay" && (typeof value.context !== "string" || value.context.length === 0)) return false;
  if (!isGeometry(value.geometry) || !record(value.state)) return false;
  return [value.state.focused, value.state.maximized, value.state.minimized].every((item) => typeof item === "boolean")
    && Number.isInteger(value.zOrder) && Number(value.zOrder) >= 0;
}
