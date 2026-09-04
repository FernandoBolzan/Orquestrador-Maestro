import type { EntityState } from "./entities.ts";
import type { RemoteData } from "./remote-data.ts";
import type { TabsState } from "./tabs.ts";

export type TuiEntity = { id: string; [key: string]: unknown };
export type ProjectWorkspace = Readonly<{ windows: readonly unknown[]; geometry: Readonly<Record<string, unknown>>; focus?: string; selected?: string; layoutMode: "AUTO" | "TILED" | "FLOATING" }>;
export type UiState = Readonly<{ activeProjectId?: string; palette: Readonly<{ open: boolean }>; modal: Readonly<{ open: boolean }>; theme: string; busy: Readonly<Record<string, number>> }>;
export type TuiState = Readonly<{
  connection: RemoteData<Record<string, unknown>>;
  projectsById: EntityState<TuiEntity>; missionsById: EntityState<TuiEntity>; taskGraphsById: EntityState<TuiEntity>;
  tasksById: EntityState<TuiEntity>; agentsById: EntityState<TuiEntity>; runsById: EntityState<TuiEntity>;
  terminalsById: EntityState<TuiEntity>; verificationsById: EntityState<TuiEntity>; attentionById: EntityState<TuiEntity>; skillsById: EntityState<TuiEntity>;
  workspaceByProjectId: Readonly<Record<string, ProjectWorkspace>>;
  tabs: TabsState;
  ui: UiState;
}>;
