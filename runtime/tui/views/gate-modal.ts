import type { AttentionItem } from "../attention/attention-state.ts";

export const FOCUS_LAYERS = ["WINDOW_CONTENT", "MODAL", "PALETTE"] as const;
export type GateFocusLayer = typeof FOCUS_LAYERS[number];
export type GateState = Readonly<{
  open: boolean; activeId?: string; focusLayer: GateFocusLayer; pendingIds: readonly string[];
  snoozedUntil: Readonly<Record<string, string>>; decisions: Readonly<Record<string, "approve" | "reject">>;
}>;
export type GateAction =
  | Readonly<{ type: "gate.open"; item: AttentionItem }>
  | Readonly<{ type: "gate.escape" }>
  | Readonly<{ type: "gate.snooze"; id: string; until: string; now?: string | number }>
  | Readonly<{ type: "gate.approve"; id: string; decision?: "approve" }>
  | Readonly<{ type: "gate.reject"; id: string; decision?: "reject" }>
  | Readonly<{ type: "palette.open" | "palette.close" }>;

export function createGateState(pendingIds: readonly string[] = []): GateState {
  return Object.freeze({ open: false, focusLayer: "WINDOW_CONTENT", pendingIds: Object.freeze([...pendingIds]), snoozedUntil: Object.freeze({}), decisions: Object.freeze({}) });
}
export function gateModalModel(item: AttentionItem) {
  const evidence = Array.isArray(item.evidence) ? item.evidence.map(String).join("\n") : String(item.evidence || "N/A");
  return Object.freeze({
    id: item.id,
    sections: Object.freeze([
      Object.freeze({ id: "WHAT", content: item.title }), Object.freeze({ id: "WHY", content: item.reason }),
      Object.freeze({ id: "IMPACT", content: item.impact }), Object.freeze({ id: "EVIDENCE", content: evidence }),
      Object.freeze({ id: "RECOMMENDATION", content: item.recommendation })
    ]),
    actions: Object.freeze([
      Object.freeze({ key: "1", id: "inspect", label: "Inspect" }), Object.freeze({ key: "2", id: "openDiff", label: "Open Diff" }),
      Object.freeze({ key: "3", id: "approve", label: "Approve" }), Object.freeze({ key: "4", id: "reject", label: "Reject" }),
      Object.freeze({ key: "s", id: "snooze", label: "Snooze" })
    ])
  });
}
export function canOpenGate(state: GateState, item: AttentionItem): boolean { return item.severity === "CRITICAL" && !state.open; }
export function gateReducer(state: GateState, action: GateAction): GateState {
  if (action.type === "gate.open") {
    if (!canOpenGate(state, action.item)) return state;
    const pendingIds = state.pendingIds.includes(action.item.id) ? state.pendingIds : Object.freeze([...state.pendingIds, action.item.id]);
    return Object.freeze({ ...state, open: true, activeId: action.item.id, focusLayer: "MODAL", pendingIds });
  }
  if (action.type === "gate.escape") return Object.freeze({ ...state, open: false, activeId: undefined, focusLayer: "WINDOW_CONTENT" });
  if (action.type === "palette.open") return Object.freeze({ ...state, focusLayer: "PALETTE" });
  if (action.type === "palette.close") return Object.freeze({ ...state, focusLayer: state.open ? "MODAL" : "WINDOW_CONTENT" });
  if (action.type === "gate.snooze") {
    const until = Date.parse(action.until); const now = typeof action.now === "string" ? Date.parse(action.now) : action.now ?? Date.now();
    if (!state.pendingIds.includes(action.id) || Number.isNaN(until) || Number.isNaN(now) || until <= now) throw new TypeError("gate.snooze requires a pending gate and valid future timestamp");
    return Object.freeze({ ...state, open: false, activeId: undefined, focusLayer: "WINDOW_CONTENT", snoozedUntil: Object.freeze({ ...state.snoozedUntil, [action.id]: action.until }) });
  }
  if (action.type !== "gate.approve" && action.type !== "gate.reject") return state;
  const expected = action.type === "gate.approve" ? "approve" : "reject";
  if (action.decision !== expected) throw new TypeError(`gate.${expected} requires decision:${expected}`);
  if (!state.pendingIds.includes(action.id)) throw new TypeError("gate decision requires a pending gate");
  return Object.freeze({ ...state, open: false, activeId: undefined, focusLayer: "WINDOW_CONTENT", pendingIds: Object.freeze(state.pendingIds.filter((id) => id !== action.id)), decisions: Object.freeze({ ...state.decisions, [action.id]: expected }) });
}
