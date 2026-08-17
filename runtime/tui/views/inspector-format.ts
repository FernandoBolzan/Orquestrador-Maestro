import { section, type Row, type Section } from "./model.ts";
import type { InspectorField } from "./inspector-model.ts";
export function formatDuration(ms: number | "N/A"): string { if (ms === "N/A" || !Number.isFinite(ms)) return "—"; const seconds = Math.floor(ms / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; }
export function formatDiff(changedFiles?: readonly unknown[], lines?: { added?: number; removed?: number }): string { if (!changedFiles?.length && !lines) return "—"; return `+${lines?.added || 0} −${lines?.removed || 0}`; }
export function timelineFromEvents(task: { id: string }, events: readonly Record<string, unknown>[]) { return events.filter((event) => event.taskId === task.id).map((event) => Object.freeze({ type: event.type, timestamp: event.timestamp, runId: event.runId })); }
export const formatNA = (value: unknown) => value === "N/A" || value === undefined || value === null ? "—" : String(value);
export function formatInspectorSections(fields: readonly InspectorField[]): Section[] {
  const keys = { summary: FSET(["id","title","objective","status","risk","complexity","priority","capabilities","dependencies","dependents"]), execution: FSET(["agent","provider","model","pid","workspace","worktree","duration","retries"]), evidence: FSET(["verification","files-changed","diff"]), timeline: FSET(["timeline"]) };
  return Object.entries(keys).map(([id, set]) => section(id, id === "summary" ? "Resumo" : id === "execution" ? "Execução" : id === "evidence" ? "Evidência" : "Timeline", fields.filter((field) => set.has(field.key)).map((field) => Object.freeze({ id: field.key, fields: Object.freeze([field.label, field.value]) }) as Row)));
}
function FSET(values: readonly string[]) { return new Set(values); }
