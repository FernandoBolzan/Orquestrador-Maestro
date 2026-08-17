export const ATTENTION_TYPES = ["QUESTION", "APPROVAL", "DECISION", "BLOCKER", "FAILURE", "CONFLICT", "SECURITY"] as const;
export const ATTENTION_SEVERITIES = ["INFO", "WARNING", "ATTENTION", "CRITICAL"] as const;
export type AttentionType = typeof ATTENTION_TYPES[number];
export type AttentionSeverity = typeof ATTENTION_SEVERITIES[number];
export type AttentionItem = Readonly<{
  id: string; projectId: string; missionId?: string; taskId?: string; type: AttentionType; severity: AttentionSeverity;
  status: string; title: string; reason: string; impact: string; evidence: unknown; recommendation: string;
  actions: readonly string[]; createdAt: string; resolvedAt?: string; decision?: string; snoozedUntil?: string;
}>;
export type AttentionState = Readonly<{
  byId: Readonly<Record<string, AttentionItem>>; ids: readonly string[]; resolvedById: Readonly<Record<string, AttentionItem>>;
}>;
export type AttentionAction =
  | Readonly<{ type: "attention.created"; item: AttentionItem }>
  | Readonly<{ type: "attention.snoozed"; id: string; snoozedUntil: string }>
  | Readonly<{ type: "attention.resolved"; id: string; decision: string; resolvedAt: string }>;

const freezeRecord = <T>(value: Record<string, T>): Readonly<Record<string, T>> => Object.freeze(value);
export function createAttentionState(): AttentionState {
  return Object.freeze({ byId: freezeRecord<AttentionItem>({}), ids: Object.freeze([]), resolvedById: freezeRecord<AttentionItem>({}) });
}
function validateItem(item: AttentionItem): AttentionItem {
  for (const field of ["id", "projectId", "type", "severity", "status", "title", "reason", "impact", "recommendation", "createdAt"] as const) {
    if (typeof item[field] !== "string" || item[field].length === 0) throw new TypeError(`AttentionItem.${field} is required`);
  }
  if (!ATTENTION_TYPES.includes(item.type) || !ATTENTION_SEVERITIES.includes(item.severity)) throw new TypeError("AttentionItem type or severity is invalid");
  if (!Array.isArray(item.actions)) throw new TypeError("AttentionItem.actions must be an array");
  return Object.freeze({ ...item, actions: Object.freeze([...item.actions]) });
}
export function attentionReducer(state: AttentionState = createAttentionState(), action: AttentionAction): AttentionState {
  if (action.type === "attention.created") {
    const item = validateItem(action.item); const exists = Boolean(state.byId[item.id]);
    return Object.freeze({ byId: freezeRecord({ ...state.byId, [item.id]: item }), ids: Object.freeze(exists ? [...state.ids] : [...state.ids, item.id]), resolvedById: state.resolvedById });
  }
  if (action.type === "attention.resolved") {
    const item = state.byId[action.id]; if (!item) return state;
    if (!action.decision || !action.resolvedAt) throw new TypeError("attention.resolved requires decision and resolvedAt");
    const byId = { ...state.byId }; delete byId[action.id];
    const resolved = Object.freeze({ ...item, status: "RESOLVED", decision: action.decision, resolvedAt: action.resolvedAt });
    return Object.freeze({ byId: freezeRecord(byId), ids: Object.freeze(state.ids.filter((id) => id !== action.id)), resolvedById: freezeRecord({ ...state.resolvedById, [action.id]: resolved }) });
  }
  if (action.type === "attention.snoozed") {
    const item = state.byId[action.id]; if (!item) return state;
    const until = Date.parse(action.snoozedUntil);
    if (Number.isNaN(until)) throw new TypeError("attention.snoozed requires snoozedUntil");
    const snoozed = Object.freeze({ ...item, status: "SNOOZED", decision: "snooze", snoozedUntil: action.snoozedUntil });
    return Object.freeze({ ...state, byId: freezeRecord({ ...state.byId, [action.id]: snoozed }) });
  }
  return state;
}
export function pendingByProject(state: AttentionState, projectId: string): AttentionItem[] {
  return state.ids.map((id) => state.byId[id]).filter((item): item is AttentionItem => Boolean(item) && item.projectId === projectId);
}
export function totalPending(state: AttentionState, projectId?: string): number { return projectId ? pendingByProject(state, projectId).length : state.ids.length; }
export function focusSurfaces(state: AttentionState): Readonly<{ total: number; byProject: Readonly<Record<string, number>> }> {
  const byProject: Record<string, number> = {};
  for (const id of state.ids) { const item = state.byId[id]; if (item) byProject[item.projectId] = (byProject[item.projectId] || 0) + 1; }
  return Object.freeze({ total: state.ids.length, byProject: Object.freeze(byProject) });
}
