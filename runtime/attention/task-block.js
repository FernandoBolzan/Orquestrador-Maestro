"use strict";

const { assertObject, requiredString, enumValue, optionalObject, optionalTimestamp } = require("../core/validation");

const TASK_BLOCK_KINDS = Object.freeze([
  "dependency", "approval", "human_input", "capability", "provider",
  "resource", "policy", "verification", "transient"
]);

const TASK_BLOCK_RECOVERABILITY = Object.freeze([
  "AUTOMATIC", "RETRYABLE", "HUMAN_REQUIRED", "OPERATOR_REQUIRED"
]);

function createTaskBlock(input = {}) {
  assertObject(input, "task block");
  const source = requiredString(input.source, "task block.source");
  const kind = enumValue(input.kind, "task block.kind", TASK_BLOCK_KINDS, "dependency");
  const recoverability = enumValue(input.recoverability, "task block.recoverability", TASK_BLOCK_RECOVERABILITY, "HUMAN_REQUIRED");
  const reason = requiredString(input.reason, "task block.reason");
  const occurredAt = input.occurredAt || new Date().toISOString();
  const recurrence = Number.isInteger(input.recurrence) && input.recurrence >= 0 ? input.recurrence : 1;

  return Object.freeze({
    kind: "task_block",
    blockKind: kind,
    source,
    recoverability,
    reason,
    occurredAt,
    recurrence,
    metadata: optionalObject(input.metadata, "task block.metadata")
  });
}

module.exports = {
  TASK_BLOCK_KINDS,
  TASK_BLOCK_RECOVERABILITY,
  createTaskBlock
};
