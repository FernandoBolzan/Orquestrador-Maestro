import type { Window } from "./contract.ts";

export function focusOrder(windows: readonly Window[]): string[] { return [...windows].sort((a, b) => a.zOrder - b.zOrder || a.id.localeCompare(b.id)).map((item) => item.id); }
export function focusWindow(windows: readonly Window[], id: string): Window[] {
  if (!windows.some((item) => item.id === id)) return [...windows];
  const order = focusOrder(windows).filter((item) => item !== id).concat(id);
  return windows.map((item) => Object.freeze({ ...item, zOrder: order.indexOf(item.id), state: Object.freeze({ ...item.state, focused: item.id === id }) }));
}
export function assertSingleFocus(windows: readonly Window[]): true { if (windows.filter((item) => item.state.focused).length > 1) throw new Error("Expected a single focused window"); return true; }
function cycle(windows: readonly Window[], delta: number): Window[] { const order = focusOrder(windows); if (!order.length) return []; const current = windows.find((item) => item.state.focused)?.id; const index = current ? order.indexOf(current) : -1; return focusWindow(windows, order[(index + delta + order.length) % order.length]!); }
export function focusNext(windows: readonly Window[]): Window[] { return cycle(windows, 1); }
export function focusPrev(windows: readonly Window[]): Window[] { return cycle(windows, -1); }
