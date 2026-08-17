import type { AttentionItem, AttentionState } from "./attention-state.ts";

const SEVERITY_ORDER: Readonly<Record<string, number>> = Object.freeze({ CRITICAL: 0, ATTENTION: 1, WARNING: 2, INFO: 3 });
export function attentionCenter(state: AttentionState, projectId?: string): AttentionItem[] {
  return state.ids.map((id) => state.byId[id]).filter((item): item is AttentionItem => Boolean(item) && (!projectId || item.projectId === projectId))
    .sort((left, right) => (SEVERITY_ORDER[left.severity] ?? 99) - (SEVERITY_ORDER[right.severity] ?? 99) || Date.parse(left.createdAt) - Date.parse(right.createdAt) || left.id.localeCompare(right.id));
}
