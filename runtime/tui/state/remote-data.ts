export type RemoteKind = "NotAsked" | "Loading" | "Success" | "Failure";

export type RemoteData<T> = Readonly<{
  kind: RemoteKind;
  data?: T;
  epoch?: string;
  retries?: number;
  error?: string;
}>;

export function notAsked<T>(): RemoteData<T> { return Object.freeze({ kind: "NotAsked" }); }
export function loading<T>(epoch?: string): RemoteData<T> { return Object.freeze({ kind: "Loading", epoch }); }
export function success<T>(data: T, epoch?: string): RemoteData<T> { return Object.freeze({ kind: "Success", data, epoch }); }
export function failure<T>(error: string, epoch?: string, retries = 0): RemoteData<T> {
  return Object.freeze({ kind: "Failure", error, epoch, retries });
}
export function isSuccess<T>(value: RemoteData<T>): value is RemoteData<T> & { kind: "Success"; data: T } { return value.kind === "Success"; }
export function isFailure<T>(value: RemoteData<T>): value is RemoteData<T> & { kind: "Failure" } { return value.kind === "Failure"; }
export function isLoading<T>(value: RemoteData<T>): value is RemoteData<T> & { kind: "Loading" } { return value.kind === "Loading"; }
export function mapR<T, U>(value: RemoteData<T>, fn: (data: T) => U): RemoteData<U> {
  return isSuccess(value) ? success(fn(value.data), value.epoch) : value as unknown as RemoteData<U>;
}

