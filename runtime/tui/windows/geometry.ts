import type { Geometry, Tier, Viewport } from "./contract.ts";

export type MinSizes = Readonly<{ minW: number; minH: number }>;
const MINIMUMS: Readonly<Record<Tier, MinSizes>> = Object.freeze({
  COMPACT: Object.freeze({ minW: 20, minH: 6 }), NORMAL: Object.freeze({ minW: 30, minH: 8 }),
  WIDE: Object.freeze({ minW: 34, minH: 8 }), ULTRAWIDE: Object.freeze({ minW: 40, minH: 10 })
});
const cell = (value: number): number => Math.floor(Number.isFinite(value) ? value : 0);
export function tierFor(width: number): Tier { const value = cell(width); return value < 70 ? "COMPACT" : value < 140 ? "NORMAL" : value < 180 ? "WIDE" : "ULTRAWIDE"; }
export function minSizesFor(tier: Tier): MinSizes { return MINIMUMS[tier]; }
export function clamp(geometry: Geometry, viewport: Viewport, minimum: MinSizes = minSizesFor(tierFor(viewport.width))): Geometry {
  const viewportWidth = Math.max(1, cell(viewport.width)); const viewportHeight = Math.max(1, cell(viewport.height));
  const width = Math.min(viewportWidth, Math.max(Math.min(minimum.minW, viewportWidth), cell(geometry.width)));
  const height = Math.min(viewportHeight, Math.max(Math.min(minimum.minH, viewportHeight), cell(geometry.height)));
  const x = Math.min(Math.max(0, cell(geometry.x)), viewportWidth - width);
  const y = Math.min(Math.max(0, cell(geometry.y)), viewportHeight - height);
  return Object.freeze({ x, y, width, height });
}
export function move(geometry: Geometry, dx: number, dy: number, viewport: Viewport): Geometry { return clamp({ ...geometry, x: cell(geometry.x + dx), y: cell(geometry.y + dy) }, viewport, { minW: 1, minH: 1 }); }
export function resize(geometry: Geometry, deltaW: number, deltaH: number, viewport: Viewport, minimum = minSizesFor(tierFor(viewport.width))): Geometry {
  const maxWidth = Math.max(1, cell(viewport.width) - Math.max(0, cell(geometry.x)));
  const maxHeight = Math.max(1, cell(viewport.height) - Math.max(0, cell(geometry.y)));
  return clamp({ ...geometry, width: Math.min(maxWidth, cell(geometry.width + deltaW)), height: Math.min(maxHeight, cell(geometry.height + deltaH)) }, viewport, minimum);
}
export function maximize(_geometry: Geometry, viewport: Viewport): Geometry { return Object.freeze({ x: 0, y: 0, width: cell(viewport.width), height: cell(viewport.height) }); }
export function restore(_geometry: Geometry, saved: Geometry): Geometry { return Object.freeze({ ...saved }); }
export type HitRegion = "title" | "content" | "resize-left" | "resize-right" | "outside";
export function hitRegion(geometry: Geometry, x: number, y: number): HitRegion {
  if (y < geometry.y || y >= geometry.y + geometry.height || x < geometry.x - 2 || x >= geometry.x + geometry.width + 2) return "outside";
  if (x <= geometry.x + 1) return "resize-left";
  if (x >= geometry.x + geometry.width - 2) return "resize-right";
  return y === geometry.y ? "title" : "content";
}
