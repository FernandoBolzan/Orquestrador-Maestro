import test from "node:test";
import assert from "node:assert/strict";
import { createNotificationState, notificationReducer, NOTIFICATION_CONFIG } from "../notifications/notification-state.ts";
import { toastRegion } from "../notifications/toast-region.ts";

test("T8.3 deduplica success em cooldown e agrega burst de falhas", () => {
  let state = createNotificationState();
  const success = { type: "mission.completed", entityId: "m1", hash: "h", tier: "SUCCESS", timestamp: 1000, payload: { title: "Missão concluída" } } as const;
  state = notificationReducer(state, success); state = notificationReducer(state, { ...success, timestamp: 2000 });
  assert.equal(state.toasts.length, 1);
  for (let index = 12; index <= 15; index += 1) state = notificationReducer(state, { type: "task.failed", entityId: `task-${index}`, hash: `h${index}`, tier: "WARNING", timestamp: 3000 + index, payload: {} });
  const failures = state.toasts.filter((toast) => toast.type === "task.failed"); assert.equal(failures.length, 1); assert.match(failures[0]?.message || "", /4 falhas/);
});

test("T8.3 tiers controlam toast, center, badge e nunca autorizam", () => {
  let state = createNotificationState({ approvals: { gate: "pending" } });
  for (let index = 0; index < 30; index += 1) state = notificationReducer(state, { type: "task.started", entityId: `t${index}`, hash: String(index), tier: "INFO", timestamp: index, payload: {} });
  assert.equal(state.toasts.length, 0); assert.equal(state.badges.INFO, 30);
  state = notificationReducer(state, { type: "attention.requested", entityId: "a1", hash: "a", tier: "ATTENTION", timestamp: 100, payload: { title: "Decisão", projectId: "p1" } });
  state = notificationReducer(state, { type: "security.detected", entityId: "s1", hash: "s", tier: "CRITICAL", timestamp: 101, payload: { title: "Segredo" } });
  assert.equal(state.centerItems.length, 32); assert.equal(state.attentionItems.length, 2);
  assert.equal(state.toasts.find((toast) => toast.tier === "ATTENTION")?.durationMs, null);
  assert.equal(state.toasts.find((toast) => toast.tier === "CRITICAL")?.prominent, true);
  const acknowledged = notificationReducer(state, { type: "toast.ack", entityId: "a1", hash: "ack", timestamp: 102, payload: {} });
  assert.equal(acknowledged.approvals.gate, "pending");
  assert.deepEqual(NOTIFICATION_CONFIG, { bell: false, desktop: { enabled: false } });
});

test("T8.3 região mostra no máximo quatro toasts sem adquirir foco", () => {
  let state = createNotificationState();
  for (let index = 0; index < 6; index += 1) state = notificationReducer(state, { type: "warning", entityId: String(index), hash: String(index), tier: "WARNING", timestamp: index, payload: { title: `Aviso ${index}` } });
  const region = toastRegion(state.toasts); assert.equal(region.visible.length, 4); assert.equal(region.queued.length, 2); assert.equal(region.focusable, false);
});
