"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { createAgentSession, isSessionActive, isSessionExpired } = require("../runtime/sessions/agent-session");

test("R3 — AgentSession: Separates operational identity from physical PTY binding", () => {
  const session = createAgentSession({
    id: "agent-session-123",
    projectId: "proj-maestro",
    missionId: "mission-456",
    taskId: "task-789",
    providerId: "opencode",
    role: "Engineering Agent",
    binding: {
      backend: "pty",
      terminalId: "pty-term-001",
      workspacePath: "/tmp/workspace-1"
    },
    permissions: {
      canSpawn: true,
      canMutate: true,
      allowPaths: ["/tmp/workspace-1"]
    }
  });

  assert.strictEqual(session.kind, "agent_session");
  assert.strictEqual(session.id, "agent-session-123");
  assert.strictEqual(session.projectId, "proj-maestro");
  assert.strictEqual(session.status, "starting");
  assert.strictEqual(session.binding.backend, "pty");
  assert.strictEqual(session.binding.terminalId, "pty-term-001");
  assert.strictEqual(session.binding.workspacePath, "/tmp/workspace-1");
  assert.strictEqual(session.permissions.canSpawn, true);
  assert.deepStrictEqual(session.permissions.allowPaths, ["/tmp/workspace-1"]);

  assert.strictEqual(isSessionActive(session), true);
  assert.strictEqual(isSessionExpired(session), false);
});

test("R3 — AgentSession: Checks expiration based on timestamp", () => {
  const past = new Date(Date.now() - 10000).toISOString();
  const future = new Date(Date.now() + 10000).toISOString();

  const expiredSession = createAgentSession({
    projectId: "proj-1",
    workspacePath: "/tmp",
    expiresAt: past
  });
  assert.strictEqual(isSessionExpired(expiredSession), true);

  const activeSession = createAgentSession({
    projectId: "proj-1",
    workspacePath: "/tmp",
    expiresAt: future
  });
  assert.strictEqual(isSessionExpired(activeSession), false);
});
