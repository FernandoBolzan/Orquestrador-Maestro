"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
test("reconnect strategy follows watchdog phases and rejects polling", () => {
  const { WATCHDOG, decide, isWatchdogOnly } = require("../runtime/events/reconnect-strategy");
  assert.equal(WATCHDOG.pingIntervalMs, 5000);
  assert.equal(decide({ missedPings: 1, attempt: 1, phase: "connected", random: () => 0.5 }).action, "backoff");
  assert.equal(decide({ missedPings: 2, attempt: 1, phase: "connected" }).action, "reconnect");
  assert.equal(decide({ missedPings: 3, attempt: 1, phase: "connected" }).action, "offline");
  assert.equal(decide({ phase: "reconnected" }).action, "resnapshot");
  assert.equal(decide({ phase: "resnapshotted" }).action, "resubscribe");
  assert.equal(decide({ phase: "resubscribed" }).action, "heal");
  assert.equal(isWatchdogOnly([{ phase: "snapshotted", kind: "ping" }, { kind: "ping" }]), true);
  assert.equal(isWatchdogOnly([{ phase: "snapshotted", kind: "snapshot.request" }]), false);
});
