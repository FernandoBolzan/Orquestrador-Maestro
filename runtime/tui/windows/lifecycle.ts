import type { Geometry, Viewport, Window } from "./contract.ts";
import { focusNext } from "./focus.ts";
import { maximize } from "./geometry.ts";

export type WindowCommand = Readonly<{ type: "terminal.detach" | "agent.terminate"; windowId: string }>;
export type LifecycleResult = Readonly<{ windows: Window[]; commands: WindowCommand[] }>;
export const WINDOW_KEY_BINDINGS = Object.freeze({ move: "Ctrl+M", resize: "Ctrl+R", fullscreen: "Ctrl+F", minimize: "Alt+M", closeView: "Ctrl+W" });
export function closeView(windows: readonly Window[], windowId: string): LifecycleResult { const remaining = windows.filter((item) => item.id !== windowId); return { windows: remaining.some((item) => item.state.focused) ? remaining : focusNext(remaining), commands: [] }; }
export function hideWindow(windows: readonly Window[], windowId: string): LifecycleResult { return { windows: windows.map((item) => item.id === windowId ? { ...item, state: { ...item.state, focused: false, minimized: true } } : item), commands: [] }; }
export function detachTerminal(windows: readonly Window[], windowId: string): LifecycleResult { return { windows: windows.filter((item) => item.id !== windowId), commands: [{ type: "terminal.detach", windowId }] }; }
export function terminateAgent(windowId: string, confirmation: Readonly<{ step: 1; confirm: boolean }>): Readonly<{ pending: boolean; step: 1; commands: WindowCommand[] }> { return confirmation.confirm ? { pending: false, step: 1, commands: [{ type: "agent.terminate", windowId }] } : { pending: true, step: 1, commands: [] }; }
export function fullscreenToggle(windows: readonly Window[], windowId: string, viewport: Viewport): LifecycleResult {
  return { windows: windows.map((item) => { if (item.id !== windowId) return item; const saved = item.state.savedGeometry; const geometry: Geometry = item.state.maximized && saved ? saved : maximize(item.geometry, viewport); return { ...item, geometry, state: { ...item.state, maximized: !item.state.maximized, savedGeometry: item.state.maximized ? undefined : item.geometry } }; }), commands: [] };
}
