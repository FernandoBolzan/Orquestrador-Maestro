"use strict";

const WATCHDOG = Object.freeze({ pingIntervalMs: 5000, maxMisses: 3, reconnectAtMiss: 2 });

function decide(input = {}) {
  const phaseActions = { reconnected: "resnapshot", resnapshotted: "resubscribe", resubscribed: "heal", healed: "heal" };
  if (phaseActions[input.phase]) return Object.freeze({ action: phaseActions[input.phase], waitMs: 0 });
  const missed = Number.isInteger(input.missedPings) ? input.missedPings : 0;
  if (missed >= WATCHDOG.maxMisses) return Object.freeze({ action: "offline", waitMs: 0 });
  if (missed >= WATCHDOG.reconnectAtMiss) return Object.freeze({ action: "reconnect", waitMs: 0 });
  const attempt = Math.max(1, Number.isInteger(input.attempt) ? input.attempt : 1);
  const base = Math.min(250 * (2 ** (attempt - 1)), 5000);
  const random = typeof input.random === "function" ? input.random() : Math.random();
  const waitMs = Math.max(1, Math.min(5000, Math.round(base * (0.8 + (Math.max(0, Math.min(1, random)) * 0.4)))));
  return Object.freeze({ action: "backoff", waitMs });
}

function isWatchdogOnly(activityLog) {
  if (!Array.isArray(activityLog)) return false;
  let snapshotted = false;
  for (const item of activityLog) {
    if (item?.phase === "snapshotted") snapshotted = true;
    if (snapshotted && item?.kind && item.kind !== "ping" && item.phase !== "snapshotted") return false;
    if (snapshotted && item?.kind && item.kind !== "ping") return false;
  }
  return snapshotted;
}

module.exports = { WATCHDOG, decide, isWatchdogOnly };
