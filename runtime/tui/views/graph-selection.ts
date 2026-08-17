import type { TaskGraphView } from "./graph-projections.ts";
export type SelectionState = Readonly<{ selectedTaskId?: string; focusProjectId: string; focusMissionId: string; history: readonly string[] }>;
export function selectTask(state: SelectionState, id: string): SelectionState { return id === state.selectedTaskId ? state : Object.freeze({ ...state, selectedTaskId: id, history: Object.freeze(state.selectedTaskId ? [...state.history, state.selectedTaskId] : [...state.history]) }); }
export function back(state: SelectionState): SelectionState { if (!state.history.length) return state; const history = [...state.history]; const selectedTaskId = history.pop(); return Object.freeze({ ...state, selectedTaskId, history: Object.freeze(history) }); }
export function moveDeps(state: SelectionState, graph: TaskGraphView): SelectionState { const dep = state.selectedTaskId ? graph.dependencies[state.selectedTaskId]?.[0] : undefined; return dep ? selectTask(state, dep) : state; }
export function moveDependents(state: SelectionState, graph: TaskGraphView): SelectionState { const dependent = state.selectedTaskId ? graph.tasks.find((task) => (graph.dependencies[task.id] || []).includes(state.selectedTaskId as string)) : undefined; return dependent ? selectTask(state, dependent.id) : state; }
export const gotoId = selectTask;
export function selectionForInspector(state: SelectionState, graph: TaskGraphView) { return Object.freeze({ graphId: graph.id, missionId: graph.missionId, task: graph.tasks.find((task) => task.id === state.selectedTaskId) }); }

