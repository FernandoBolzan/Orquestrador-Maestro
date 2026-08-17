"use strict";

const { RUN_STATUSES } = require("../core/entities");

const EVENT_STATUS = Object.freeze({
  "run.created": "pending",
  "run.started": "running",
  "verification.completed": null,
  "verification.failed": null,
  "run.completed": "completed",
  "run.failed": "failed",
  "run.cancel_requested": "cancelled",
  "run.timed_out": "timed_out"
});

const FINALIZATION_TABLE = Object.freeze({
  completed_passed: "completed",
  completed_failed: "failed",
  completed_skipped: "failed",
  failed_passed: "failed",
  cancelled_skipped: "cancelled",
  timed_out_skipped: "timed_out"
});

function finalizeRunStatus({ executionStatus, verification = {}, cancelled = false, timedOut = false } = {}) {
  if (timedOut || executionStatus === "timed_out") return "timed_out";
  if (cancelled || executionStatus === "cancelled") return "cancelled";
  return executionStatus === "completed" && verification.status === "passed" ? "completed" : "failed";
}

function transition({ run, event } = {}) {
  if (!run || !RUN_STATUSES.includes(run.status)) throw new TypeError(`unknown run status: ${run?.status}`);
  if (!event || !Object.prototype.hasOwnProperty.call(EVENT_STATUS, event.type)) {
    throw new TypeError(`unknown run event: ${event?.type}`);
  }
  const status = EVENT_STATUS[event.type];
  const nextRun = Object.freeze(status ? { ...run, status } : { ...run });
  return Object.freeze({ run: nextRun, emitted: Object.freeze({ ...event }) });
}

module.exports = { EVENT_STATUS, FINALIZATION_TABLE, finalizeRunStatus, transition };

