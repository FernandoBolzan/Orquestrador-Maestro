export type RuntimeAction = Readonly<{
  source: "runtime-event";
  family: string;
  type: string;
  epoch: string;
  seq: number;
  timestamp: string;
  payload: Record<string, unknown>;
  nonMonotonic?: boolean;
  kind?: "normalization-failure" | "unknown-event";
  dropped?: boolean;
  error?: string;
}>;

export type UserAction = Readonly<{
  source: "user-action";
  type: string;
  payload?: Record<string, unknown>;
}>;

export type TuiAction = RuntimeAction | UserAction;

