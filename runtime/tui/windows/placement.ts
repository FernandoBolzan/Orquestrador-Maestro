import type { Tier, Viewport, Window } from "./contract.ts";
import { clamp, tierFor } from "./geometry.ts";
import { FLOATING_PROVEN } from "./spike-flags.ts";

export type PlacementAction = Readonly<{ kind: "agent" | "inspect" | "plan" | "attention-critical"; window: Window }>;
export function floatingEnabled(tier: Tier): boolean { return FLOATING_PROVEN && (tier === "WIDE" || tier === "ULTRAWIDE"); }
export function keyboardFallback(_tier: Tier): readonly string[] { return Object.freeze(["Ctrl+M move", "Ctrl+R resize", "Ctrl+F maximize", "Alt+M minimize", "Ctrl+W close view"]); }
export function autoPlace(windows: readonly Window[], action: PlacementAction, viewport: Viewport): Window[] {
  const tier = tierFor(viewport.width); const incoming = action.window;
  if (tier === "COMPACT") return [{ ...incoming, geometry: { x: 0, y: 0, ...viewport }, zOrder: 0 }];
  const existing = windows.filter((item) => item.id !== incoming.id);
  let geometry = incoming.geometry;
  if (action.kind === "plan") geometry = { x: 0, y: 0, width: Math.floor(viewport.width / 2), height: viewport.height };
  if (action.kind === "agent" || action.kind === "inspect" || (action.kind === "attention-critical" && tier === "NORMAL")) geometry = { x: Math.floor(viewport.width / 2), y: 0, width: viewport.width - Math.floor(viewport.width / 2), height: viewport.height };
  if (action.kind === "attention-critical" && (tier === "WIDE" || tier === "ULTRAWIDE")) { const width = Math.min(60, viewport.width - 4); const height = Math.min(16, viewport.height - 4); geometry = { x: Math.floor((viewport.width - width) / 2), y: Math.floor((viewport.height - height) / 2), width, height }; }
  return existing.concat({ ...incoming, geometry: clamp(geometry, viewport), zOrder: existing.length });
}
export function tiledSplit(windows: readonly Window[], direction: "vertical" | "horizontal", viewport: Viewport): Window[] {
  const count = Math.max(1, windows.length);
  return windows.map((item, index) => {
    if (direction === "vertical") { const start = Math.floor(viewport.width * index / count); const end = Math.floor(viewport.width * (index + 1) / count); return { ...item, geometry: { x: start, y: 0, width: end - start, height: viewport.height }, zOrder: index }; }
    const start = Math.floor(viewport.height * index / count); const end = Math.floor(viewport.height * (index + 1) / count); return { ...item, geometry: { x: 0, y: start, width: viewport.width, height: end - start }, zOrder: index };
  });
}
