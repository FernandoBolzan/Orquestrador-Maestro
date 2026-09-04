import { upsertEntity } from "./entities.ts";
import { failure, notAsked, success } from "./remote-data.ts";
import type { TuiAction } from "./actions.ts";
import type { EntityState } from "./entities.ts";
import type { TuiEntity, TuiState, UiState } from "./types.ts";
import { initialTabsState, tabsReducer } from "./tabs.ts";

const emptyEntities = (): EntityState<TuiEntity> => Object.freeze({ byId: Object.freeze({}), ids: Object.freeze([]) });
export function initialState(): TuiState {
  return Object.freeze({
    connection: notAsked(), projectsById: emptyEntities(), missionsById: emptyEntities(), taskGraphsById: emptyEntities(),
    tasksById: emptyEntities(), agentsById: emptyEntities(), runsById: emptyEntities(), terminalsById: emptyEntities(),
    verificationsById: emptyEntities(), attentionById: emptyEntities(), skillsById: emptyEntities(), workspaceByProjectId: Object.freeze({}),
    tabs: initialTabsState(), ui: Object.freeze({ palette: Object.freeze({ open: false }), modal: Object.freeze({ open: false }), theme: "default", busy: Object.freeze({}) })
  });
}

function payloadEntity(action: TuiAction): TuiEntity | undefined {
  if (action.source !== "runtime-event" || action.kind) return undefined;
  const payload = action.payload;
  const id = payload.id ?? payload.taskId ?? payload.runId ?? payload.terminalId;
  return typeof id === "string" ? { ...payload, id } : undefined;
}

export function connectionReducer(state: TuiState["connection"], action: TuiAction): TuiState["connection"] {
  if (action.source !== "runtime-event" || action.type !== "runtime.status") return state;
  const status = action.payload.status;
  return status === "ok" || status === "running" ? success(action.payload, action.epoch) : failure(String(action.payload.error || status || "disconnected"), action.epoch, Number(action.payload.retries || 0));
}

export function uiReducer(state: UiState, action: TuiAction): UiState {
  if (action.source !== "user-action") return state;
  const payload = action.payload || {};
  if (action.type === "ui.activeProject") return Object.freeze({ ...state, activeProjectId: String(payload.projectId) });
  if (action.type === "ui.palette.open" || action.type === "ui.palette.close") return Object.freeze({ ...state, palette: Object.freeze({ open: action.type.endsWith("open") }) });
  if (action.type === "ui.modal.open" || action.type === "ui.modal.close") return Object.freeze({ ...state, modal: Object.freeze({ open: action.type.endsWith("open") }) });
  if (action.type === "ui.busy.start" || action.type === "ui.busy.end") {
    const operation = String(payload.operation || "default");
    const current = state.busy[operation] || 0;
    const count = Math.max(0, current + (action.type.endsWith("start") ? 1 : -1));
    const busy = { ...state.busy, [operation]: count };
    if (count === 0) delete busy[operation];
    return Object.freeze({ ...state, busy: Object.freeze(busy) });
  }
  return state;
}

const SLICE_BY_FAMILY = Object.freeze({ project: "projectsById", mission: "missionsById", plan: "taskGraphsById", task: "tasksById", agent: "agentsById", run: "runsById", terminal: "terminalsById", verification: "verificationsById", attention: "attentionById", skill: "skillsById" } as const);

export function rootReducer(state: TuiState = initialState(), action: TuiAction): TuiState {
  let next: TuiState = state;
  const connection = connectionReducer(state.connection, action);
  const ui = uiReducer(state.ui, action);
  const tabs = action.source === "user-action" ? tabsReducer(state.tabs, action) : state.tabs;
  const activeTab = tabs.items.find((tab) => tab.id === tabs.activeId);
  const nextUi = tabs !== state.tabs && activeTab?.projectId ? Object.freeze({ ...ui, activeProjectId: activeTab.projectId }) : ui;
  if (connection !== state.connection || nextUi !== state.ui || tabs !== state.tabs) next = { ...next, connection, ui: nextUi, tabs };
  if (action.source === "runtime-event") {
    const slice = SLICE_BY_FAMILY[action.family as keyof typeof SLICE_BY_FAMILY];
    const entity = payloadEntity(action);
    if (slice && entity) next = { ...next, [slice]: upsertEntity(state[slice], entity) };
  }
  return next === state ? state : Object.freeze(next);
}
