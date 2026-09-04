"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { RUN_STATUSES } = require("../runtime/core/entities");
const {
  finalizeRunStatus,
  transition,
  FINALIZATION_TABLE
} = require("../runtime/runs/run-lifecycle-state-machine");

test("F5.2 finaliza runs somente com estados canônicos", () => {
  const cases = [
    [{ executionStatus: "completed", verification: { status: "passed" } }, "completed"],
    [{ executionStatus: "completed", verification: { status: "failed" } }, "failed"],
    [{ executionStatus: "failed", verification: { status: "passed" } }, "failed"],
    [{ executionStatus: "completed", verification: { status: "skipped" } }, "failed"],
    [{ executionStatus: "cancelled", verification: { status: "skipped" }, cancelled: true }, "cancelled"],
    [{ executionStatus: "timed_out", verification: { status: "skipped" }, timedOut: true }, "timed_out"]
  ];
  for (const [input, expected] of cases) {
    const actual = finalizeRunStatus(input);
    assert.equal(actual, expected);
    assert.ok(RUN_STATUSES.includes(actual));
  }
  assert.ok(Object.isFrozen(FINALIZATION_TABLE));
});

test("F5.2 transições são imutáveis e rejeitam evento ou estado desconhecido", () => {
  const pending = Object.freeze({ id: "run-1", status: "pending" });
  const started = transition({ run: pending, event: { type: "run.started" } });
  assert.equal(started.run.status, "running");
  assert.equal(pending.status, "pending");
  assert.ok(Object.isFrozen(started));
  assert.throws(() => transition({ run: { id: "x", status: "mystery" }, event: { type: "run.started" } }), /unknown run status/);
  assert.throws(() => transition({ run: pending, event: { type: "run.exploded" } }), /unknown run event/);
});
