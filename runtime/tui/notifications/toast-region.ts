import type { Toast } from "./notification-state.ts";

export function toastRegion(toasts: readonly Toast[]) {
  const ordered = [...toasts].sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id));
  return Object.freeze({ visible: Object.freeze(ordered.slice(0, 4)), queued: Object.freeze(ordered.slice(4)), focusable: false as const, focusLayer: null });
}
