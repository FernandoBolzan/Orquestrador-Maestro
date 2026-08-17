import { selectAll } from "./entities.ts";
import type { TuiEntity, TuiState } from "./types.ts";

export const selectActiveProjectId = (state: TuiState) => state.ui.activeProjectId;
export const selectConnection = (state: TuiState) => state.connection;
export const selectUi = (state: TuiState) => state.ui;
export const selectProject = (state: TuiState, id: string) => state.projectsById.byId[id];
export const selectMission = (state: TuiState, id: string) => state.missionsById.byId[id];
export const selectWorkspace = (state: TuiState, projectId: string) => state.workspaceByProjectId[projectId];
export const selectAllProjects = (state: TuiState) => selectAll(state.projectsById);

let pendingCacheState: TuiState | undefined;
const pendingCache = new Map<string, TuiEntity[]>();
export function selectPendingAttention(state: TuiState, projectId?: string): TuiEntity[] {
  if (pendingCacheState !== state) { pendingCacheState = state; pendingCache.clear(); }
  const key = projectId || "*";
  const hit = pendingCache.get(key); if (hit) return hit;
  const result = selectAll(state.attentionById).filter((entry) => entry.status === "pending" && (!projectId || entry.projectId === projectId));
  pendingCache.set(key, result); return result;
}
export const selectBusyOperations = (state: TuiState) => Object.keys(state.ui.busy).filter((key) => state.ui.busy[key] > 0);
export const selectRunsByStatus = (state: TuiState, status: string) => selectAll(state.runsById).filter((run) => run.status === status);
export const selectActiveAgents = (state: TuiState, projectId?: string) => selectAll(state.agentsById).filter((agent) => agent.status === "active" && (!projectId || agent.projectId === projectId));
export const selectTaskGraph = (state: TuiState, missionId: string) => selectAll(state.taskGraphsById).find((graph) => graph.missionId === missionId);
export const selectTasksByMission = (state: TuiState, missionId: string) => selectAll(state.tasksById).filter((task) => task.missionId === missionId);

