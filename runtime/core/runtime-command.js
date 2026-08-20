"use strict";

const crypto = require("node:crypto");
const { assertObject, requiredString, optionalString } = require("./validation");

function createRuntimeCommand(input = {}) {
  assertObject(input, "runtime command");
  const requestId = input.requestId || input.id || `req-${crypto.randomUUID()}`;
  const operation = requiredString(input.operation || input.type, "runtime command.operation");
  const projectId = optionalString(input.projectId, "runtime command.projectId");
  const idempotencyKey = optionalString(input.idempotencyKey, "runtime command.idempotencyKey");
  const payload = input.payload !== undefined && input.payload !== null ? input.payload : {};
  if (typeof payload !== "object" || Array.isArray(payload)) {
    throw new TypeError("runtime command.payload must be an object");
  }
  const expectedVersion = input.expectedVersion !== undefined ? input.expectedVersion : undefined;
  if (expectedVersion !== undefined && (!Number.isInteger(expectedVersion) || expectedVersion < 0)) {
    throw new TypeError("runtime command.expectedVersion must be a non-negative integer");
  }

  return Object.freeze({
    kind: "command",
    id: requestId,
    requestId: requiredString(requestId, "runtime command.requestId"),
    operation,
    type: operation,
    ...(projectId ? { projectId } : {}),
    ...(idempotencyKey ? { idempotencyKey } : {}),
    ...(expectedVersion !== undefined ? { expectedVersion } : {}),
    timestamp: input.timestamp || new Date().toISOString(),
    payload: Object.freeze({ ...payload })
  });
}

module.exports = { createRuntimeCommand };
