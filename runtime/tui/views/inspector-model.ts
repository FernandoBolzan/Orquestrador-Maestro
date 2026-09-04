export type InspectorField = Readonly<{ key: string; label: string; value: unknown; present: boolean; reason?: "missing" | "not-applicable" }>;
const FIELDS = Object.freeze([
  "id", "title", "objective", "status", "risk", "complexity", "priority", "capabilities", "dependencies", "dependents",
  "agent", "provider", "model", "pid", "workspace", "worktree", "duration", "retries", "verification", "files-changed", "diff", "timeline"
]);
export function fieldValue(source: Record<string, unknown>, key: string): InspectorField {
  const value = source[key]; const absent = value === undefined || value === null || value === "" || (typeof value === "object" && !Array.isArray(value) && Object.keys(value as object).length === 0);
  return Object.freeze({ key, label: key, value: absent ? "N/A" : value, present: !absent, ...(absent ? { reason: "missing" as const } : {}) });
}
export function inspectorModel(_state: unknown, selection: { task?: Record<string, unknown> }): InspectorField[] { const task = selection.task || {}; return FIELDS.map((key) => fieldValue(task, key)); }
