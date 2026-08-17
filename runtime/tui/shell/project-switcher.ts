import type { UserAction } from "../state/actions.ts";

type Entry = Readonly<{ id: string; name?: string; [key: string]: unknown }>;
export type SwitcherState = Readonly<{ open: boolean; query: string; selectedIndex: number; entries: readonly Entry[]; source: readonly Entry[] }>;
export function openSwitcher(entries: readonly Entry[]): SwitcherState { return Object.freeze({ open: true, query: "", selectedIndex: 0, entries: Object.freeze([...entries]), source: entries }); }
export function closeSwitcher(state: SwitcherState): SwitcherState { return Object.freeze({ ...state, open: false }); }
export function updateQuery(state: SwitcherState, query: string): SwitcherState {
  const needle = query.trim().toLowerCase(); const entries = state.source.filter((entry) => `${entry.name || ""} ${entry.id}`.toLowerCase().includes(needle));
  return Object.freeze({ ...state, query, selectedIndex: 0, entries: Object.freeze(entries) });
}
export function moveSelection(state: SwitcherState, delta: number): SwitcherState {
  if (!state.entries.length) return state; const index = (state.selectedIndex + delta + state.entries.length) % state.entries.length;
  return Object.freeze({ ...state, selectedIndex: index });
}
export function confirm(state: SwitcherState, activeProjectId?: string): UserAction[] {
  const entry = state.entries[state.selectedIndex]; if (!entry || entry.id === activeProjectId) return [];
  return [{ source: "user-action", type: "tab.activate", payload: { id: entry.id } }, { source: "user-action", type: "ui.palette.close" }];
}
export function overflowModel(items: readonly Entry[], visibleCount: number) {
  const visible = items.slice(0, visibleCount), hidden = items.slice(visibleCount);
  return Object.freeze({ visible, hidden, hiddenCount: hidden.length, marker: hidden.length ? `» +${hidden.length}` : "", cycleRecent: hidden.map((entry) => entry.id) });
}
