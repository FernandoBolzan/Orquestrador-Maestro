import type { UserAction } from "./actions.ts";

export type Tab = Readonly<{ id: string; projectId?: string; kind: "cockpit" | "project"; pinned: boolean; badge?: string }>;
export type TabsState = Readonly<{ items: readonly Tab[]; activeId: string; pinnedIds: readonly string[]; recentIds: readonly string[]; overflow: number }>;

export function initialTabsState(): TabsState {
  return Object.freeze({ items: Object.freeze([{ id: "cockpit", kind: "cockpit", pinned: true }]), activeId: "cockpit", pinnedIds: Object.freeze(["cockpit"]), recentIds: Object.freeze(["cockpit"]), overflow: 0 });
}
export function visibleTabCount(width: number): number { return Math.max(2, Math.floor(width / 18)); }

export function tabsReducer(state: TabsState, action: UserAction): TabsState {
  const payload = action.payload || {};
  const id = String(payload.id || "");
  if (action.type === "tab.open") {
    if (!id || state.items.some((tab) => tab.id === id)) return state;
    const tab: Tab = Object.freeze({ id, projectId: String(payload.projectId || id), kind: payload.kind === "cockpit" ? "cockpit" : "project", pinned: false });
    return Object.freeze({ ...state, items: Object.freeze([...state.items, tab]) });
  }
  if (action.type === "tab.activate") {
    if (!state.items.some((tab) => tab.id === id) || state.activeId === id) return state;
    return Object.freeze({ ...state, activeId: id, recentIds: Object.freeze([id, ...state.recentIds.filter((entry) => entry !== id)]) });
  }
  if (action.type === "tab.pin" || action.type === "tab.unpin") {
    if (id === "cockpit" && action.type === "tab.unpin") return state;
    const pinned = action.type === "tab.pin";
    return Object.freeze({ ...state, items: Object.freeze(state.items.map((tab) => tab.id === id ? Object.freeze({ ...tab, pinned }) : tab)), pinnedIds: Object.freeze(pinned ? [...new Set([...state.pinnedIds, id])] : state.pinnedIds.filter((entry) => entry !== id)) });
  }
  if (action.type === "tab.close") {
    if (id === "cockpit" || (payload.overflow && state.pinnedIds.includes(id))) return state;
    const index = state.items.findIndex((tab) => tab.id === id); if (index < 0) return state;
    const items = state.items.filter((tab) => tab.id !== id);
    const neighbor = items[Math.min(index, items.length - 1)]?.id || "cockpit";
    return Object.freeze({ ...state, items: Object.freeze(items), activeId: state.activeId === id ? neighbor : state.activeId, recentIds: Object.freeze(state.recentIds.filter((entry) => entry !== id)), pinnedIds: Object.freeze(state.pinnedIds.filter((entry) => entry !== id)) });
  }
  if (action.type === "tab.reorder") {
    const from = Number(payload.from), to = Number(payload.to); const items = [...state.items];
    if (!Number.isInteger(from) || !Number.isInteger(to) || from <= 0 || to <= 0 || from >= items.length || to >= items.length) return state;
    const [tab] = items.splice(from, 1); items.splice(to, 0, tab); return Object.freeze({ ...state, items: Object.freeze(items) });
  }
  return state;
}
