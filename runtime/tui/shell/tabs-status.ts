import { selectActiveAgents, selectPendingAttention, selectRunsByStatus } from "../state/selectors.ts";
import { visibleTabCount } from "../state/tabs.ts";
import type { TuiState } from "../state/types.ts";

export type TabStatusResult = Readonly<{
  kind: "failed" | "attention" | "verifying" | "running" | "completed" | "idle";
  agentCount: number;
  attentionCount: number;
  label: string;
}>;

export function tabStatus(state: TuiState, projectId: string): TabStatusResult {
  const failed =
    selectRunsByStatus(state, "failed").some((run) => run.projectId === projectId) ||
    Object.values(state.verificationsById.byId).some(
      (verification) => verification.projectId === projectId && verification.status === "failed"
    );
  const attentionCount = selectPendingAttention(state, projectId).length;
  const agentCount = selectActiveAgents(state, projectId).length;
  const verifying =
    selectRunsByStatus(state, "verifying").some((run) => run.projectId === projectId) ||
    Object.values(state.tasksById.byId).some(
      (task) => task.projectId === projectId && task.status === "verifying"
    );
  const completed =
    !failed &&
    !attentionCount &&
    !agentCount &&
    !verifying &&
    selectRunsByStatus(state, "completed").some((run) => run.projectId === projectId);

  const kind: TabStatusResult["kind"] = failed
    ? "failed"
    : attentionCount
    ? "attention"
    : verifying
    ? "verifying"
    : agentCount
    ? "running"
    : completed
    ? "completed"
    : "idle";

  const label =
    kind === "failed"
      ? "✕"
      : kind === "attention"
      ? `⚠${attentionCount}`
      : kind === "verifying"
      ? "◐"
      : kind === "running"
      ? `●${agentCount}`
      : kind === "completed"
      ? "✓"
      : "○ idle";

  return Object.freeze({ kind, agentCount, attentionCount, label });
}

export function formatTabLabel(name: string, status: { kind: string; agentCount?: number; attentionCount?: number }): string {
  const symbol =
    status.kind === "failed"
      ? "✕"
      : status.kind === "attention"
      ? `⚠${status.attentionCount || 1}`
      : status.kind === "verifying"
      ? "◐"
      : status.kind === "running"
      ? `●${status.agentCount || 1}`
      : status.kind === "completed"
      ? "✓"
      : "○";

  return `${name} ${symbol}`;
}

export function tabBarModel(state: TuiState & { tabs: { items: readonly unknown[] } }, width: number) {
  const count = visibleTabCount(width);
  const visible = state.tabs.items.slice(0, count);
  const hidden = state.tabs.items.slice(count);
  return Object.freeze({ visible, hidden, overflow: hidden.length ? `» +${hidden.length}` : "" });
}
