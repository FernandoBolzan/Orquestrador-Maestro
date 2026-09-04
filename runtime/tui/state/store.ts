import type { TuiAction } from "./actions.ts";
import { initialState, rootReducer } from "./reducers.ts";
import type { TuiState } from "./types.ts";

type Listener = (before: TuiState, after: TuiState) => void;

export class TuiStore {
  #state: TuiState;
  #listeners = new Set<Listener>();
  #seen = new Set<string>();
  constructor(initial: TuiState = initialState()) { this.#state = initial; }
  getState(): TuiState { return this.#state; }
  dispatch(action: TuiAction): TuiState {
    if (action.source === "runtime-event") {
      const entityId = action.payload.id ?? action.payload.taskId ?? action.payload.runId ?? "";
      const key = `${action.type}:${String(entityId)}:${action.seq}`;
      if (this.#seen.has(key)) return this.#state;
      this.#seen.add(key);
    }
    const before = this.#state;
    const after = rootReducer(before, action);
    if (after === before) return after;
    this.#state = after;
    for (const listener of this.#listeners) { try { listener(before, after); } catch { /* listener isolation */ } }
    return after;
  }
  subscribe(listener: Listener): () => void { this.#listeners.add(listener); return () => this.#listeners.delete(listener); }
  select<T>(selector: (state: TuiState) => T): T { return selector(this.#state); }
}
export function createTuiStore(initial?: TuiState): TuiStore { return new TuiStore(initial); }
