import type { AttentionItem, AttentionSeverity, AttentionType } from "../attention/attention-state.ts";

export const NOTIFICATION_CONFIG = Object.freeze({ bell: false, desktop: Object.freeze({ enabled: false }) });
export const NOTIFICATION_COOLDOWN_MS = 30_000;
export type NotificationTier = "INFO" | "SUCCESS" | "WARNING" | "ATTENTION" | "CRITICAL";
export type NotificationEvent = Readonly<{ type: string; entityId: string; hash: string; tier?: NotificationTier; timestamp: number; payload: Readonly<Record<string, unknown>> }>;
export type Toast = Readonly<{ id: string; type: string; entityId: string; tier: Exclude<NotificationTier, "INFO">; message: string; durationMs: number | null; prominent: boolean; actions: readonly string[]; count: number; createdAt: number }>;
type CenterItem = Readonly<{ id: string; type: string; entityId: string; tier: NotificationTier; message: string; timestamp: number }>;
type Burst = Readonly<{ toastId: string; count: number; lastAt: number }>;
export type NotificationState = Readonly<{
  toasts: readonly Toast[]; centerItems: readonly CenterItem[]; attentionItems: readonly AttentionItem[];
  badges: Readonly<Record<NotificationTier, number>>; dedupeKeys: Readonly<Record<string, number>>; bursts: Readonly<Record<string, Burst>>;
  approvals: Readonly<Record<string, string>>;
}>;

const EMPTY_BADGES: Readonly<Record<NotificationTier, number>> = Object.freeze({ INFO: 0, SUCCESS: 0, WARNING: 0, ATTENTION: 0, CRITICAL: 0 });
export function createNotificationState(seed: { approvals?: Readonly<Record<string, string>> } = {}): NotificationState {
  return Object.freeze({ toasts: Object.freeze([]), centerItems: Object.freeze([]), attentionItems: Object.freeze([]), badges: EMPTY_BADGES, dedupeKeys: Object.freeze({}), bursts: Object.freeze({}), approvals: Object.freeze({ ...(seed.approvals || {}) }) });
}
const duration = (tier: NotificationTier): number | null => tier === "SUCCESS" ? 2000 : tier === "WARNING" ? 4000 : tier === "INFO" ? 0 : null;
const messageFor = (event: NotificationEvent): string => typeof event.payload.title === "string" && event.payload.title ? event.payload.title : event.type;
function attentionFrom(event: NotificationEvent, tier: "ATTENTION" | "CRITICAL"): AttentionItem {
  const payload = event.payload; const createdAt = new Date(event.timestamp).toISOString();
  return Object.freeze({ id: event.entityId, projectId: String(payload.projectId || "global"), type: String(payload.attentionType || (tier === "CRITICAL" ? "SECURITY" : "DECISION")) as AttentionType, severity: tier as AttentionSeverity, status: "PENDING", title: messageFor(event), reason: String(payload.reason || messageFor(event)), impact: String(payload.impact || "Requer intervenção humana."), evidence: payload.evidence || [], recommendation: String(payload.recommendation || "Inspecione antes de decidir."), actions: Object.freeze(["view", "snooze"]), createdAt });
}
export function notificationReducer(state: NotificationState = createNotificationState(), event: NotificationEvent): NotificationState {
  if (event.type === "toast.ack") return Object.freeze({ ...state, toasts: Object.freeze(state.toasts.filter((toast) => toast.entityId !== event.entityId)) });
  const tier: NotificationTier = event.tier || "INFO"; const key = `${event.type}\u0000${event.entityId}\u0000${event.hash}`;
  const seenAt = state.dedupeKeys[key]; if (seenAt !== undefined && event.timestamp - seenAt < NOTIFICATION_COOLDOWN_MS) return state;
  const dedupeKeys = Object.freeze({ ...state.dedupeKeys, [key]: event.timestamp });
  const badges = Object.freeze({ ...state.badges, [tier]: state.badges[tier] + 1 });
  const center = Object.freeze({ id: `${event.type}:${event.entityId}:${event.timestamp}`, type: event.type, entityId: event.entityId, tier, message: messageFor(event), timestamp: event.timestamp });
  const centerItems = Object.freeze([...state.centerItems, center]);
  if (tier === "INFO" || event.type.endsWith(".started") || event.type.endsWith(".output")) return Object.freeze({ ...state, centerItems, badges, dedupeKeys });
  let toasts = [...state.toasts]; let bursts = { ...state.bursts };
  if (event.type === "task.failed" && bursts[event.type] && event.timestamp - bursts[event.type].lastAt < NOTIFICATION_COOLDOWN_MS) {
    const burst = bursts[event.type]; const count = burst.count + 1;
    toasts = toasts.map((toast) => toast.id === burst.toastId ? Object.freeze({ ...toast, count, message: `${count} falhas de tarefas` }) : toast);
    bursts[event.type] = Object.freeze({ ...burst, count, lastAt: event.timestamp });
  } else {
    const id = `toast:${event.type}:${event.entityId}:${event.timestamp}`;
    const toast = Object.freeze({ id, type: event.type, entityId: event.entityId, tier: tier as Exclude<NotificationTier, "INFO">, message: messageFor(event), durationMs: duration(tier), prominent: tier === "CRITICAL", actions: Object.freeze(tier === "ATTENTION" || tier === "CRITICAL" ? ["view", "snooze"] : []), count: 1, createdAt: event.timestamp });
    toasts.push(toast); if (event.type === "task.failed") bursts[event.type] = Object.freeze({ toastId: id, count: 1, lastAt: event.timestamp });
  }
  const attentionItems = tier === "ATTENTION" || tier === "CRITICAL" ? Object.freeze([...state.attentionItems, attentionFrom(event, tier)]) : state.attentionItems;
  return Object.freeze({ ...state, toasts: Object.freeze(toasts), centerItems, attentionItems, badges, dedupeKeys, bursts: Object.freeze(bursts) });
}
