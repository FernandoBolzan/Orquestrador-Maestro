"use strict";

const crypto = require("node:crypto");
const { assertObject, requiredString, optionalString, optionalTimestamp, enumValue, optionalObject, optionalArray } = require("../core/validation");

const AGENT_SESSION_STATUSES = Object.freeze([
  "starting", "active", "idle", "running", "waiting_for_input",
  "closing", "closed", "failed", "recovered", "orphaned"
]);

const BINDING_BACKENDS = Object.freeze(["pty", "process", "workspace", "worktree"]);

function createAgentSession(input = {}) {
  assertObject(input, "agent session");
  const id = input.id || `agent-session-${crypto.randomUUID()}`;
  const projectId = requiredString(input.projectId, "agent session.projectId");
  const rootSessionId = input.rootSessionId || input.parentSessionId || id;
  const depth = Number.isInteger(input.depth) && input.depth >= 0 ? input.depth : 0;
  const status = enumValue(input.status, "agent session.status", AGENT_SESSION_STATUSES, "starting");
  const createdAt = input.createdAt || new Date().toISOString();
  const expiresAt = optionalTimestamp(input.expiresAt, "agent session.expiresAt");

  const bindingInput = input.binding || {};
  const binding = Object.freeze({
    backend: enumValue(bindingInput.backend, "binding.backend", BINDING_BACKENDS, "pty"),
    terminalId: optionalString(bindingInput.terminalId, "binding.terminalId"),
    workspacePath: requiredString(bindingInput.workspacePath || input.workspacePath, "binding.workspacePath"),
    sourceWorkspacePath: optionalString(bindingInput.sourceWorkspacePath || input.sourceWorkspacePath, "binding.sourceWorkspacePath"),
    workspaceId: optionalString(bindingInput.workspaceId || input.workspaceId, "binding.workspaceId"),
    pid: Number.isInteger(bindingInput.pid) ? bindingInput.pid : undefined
  });

  const permissions = input.permissions ? Object.freeze({
    canSpawn: input.permissions.canSpawn !== false,
    canMutate: input.permissions.canMutate !== false,
    allowPaths: Array.isArray(input.permissions.allowPaths) ? Object.freeze([...input.permissions.allowPaths]) : undefined,
    allowCommands: Array.isArray(input.permissions.allowCommands) ? Object.freeze([...input.permissions.allowCommands]) : undefined
  }) : Object.freeze({ canSpawn: true, canMutate: true });

  return Object.freeze({
    kind: "agent_session",
    id: requiredString(id, "agent session.id"),
    projectId,
    missionId: optionalString(input.missionId, "agent session.missionId"),
    taskId: optionalString(input.taskId, "agent session.taskId"),
    runId: optionalString(input.runId, "agent session.runId"),
    providerId: optionalString(input.providerId, "agent session.providerId"),
    role: optionalString(input.role, "agent session.role"),
    parentSessionId: optionalString(input.parentSessionId, "agent session.parentSessionId"),
    rootSessionId,
    depth,
    status,
    createdAt,
    startedAt: optionalTimestamp(input.startedAt, "agent session.startedAt"),
    completedAt: optionalTimestamp(input.completedAt, "agent session.completedAt"),
    expiresAt,
    binding,
    permissions,
    metadata: optionalObject(input.metadata, "agent session.metadata")
  });
}

function isSessionActive(session) {
  return session && ["starting", "active", "idle", "running", "waiting_for_input"].includes(session.status);
}

function isSessionExpired(session, now = Date.now()) {
  if (!session?.expiresAt) return false;
  return new Date(session.expiresAt).getTime() <= now;
}

module.exports = {
  AGENT_SESSION_STATUSES,
  BINDING_BACKENDS,
  createAgentSession,
  isSessionActive,
  isSessionExpired
};
