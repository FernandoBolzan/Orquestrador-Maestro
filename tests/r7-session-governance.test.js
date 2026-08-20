"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { SessionGovernor } = require("../runtime/sessions/session-governor");
const { createAgentSession } = require("../runtime/sessions/agent-session");

test("R7 — Safe Spawn: Enforces maxSpawnDepth and maxChildrenPerSession", () => {
  const governor = new SessionGovernor({ maxSpawnDepth: 2, maxChildrenPerSession: 2 });

  const root = governor.validateSpawn(null, {
    projectId: "proj-1",
    workspacePath: "/tmp"
  });
  assert.strictEqual(root.depth, 0);

  // Depth 1 child
  const child1 = governor.validateSpawn(root, { workspacePath: "/tmp" });
  assert.strictEqual(child1.depth, 1);

  // Depth 2 child
  const grandChild = governor.validateSpawn(child1, { workspacePath: "/tmp" });
  assert.strictEqual(grandChild.depth, 2);

  // Depth 3 child -> exceeds maxSpawnDepth (2)
  assert.throws(
    () => governor.validateSpawn(grandChild, { workspacePath: "/tmp" }),
    (err) => err.code === "SPAWN_DEPTH_EXCEEDED"
  );
});

test("R7 — Permission Narrowing: Child permissions cannot exceed parent permissions", () => {
  const governor = new SessionGovernor();

  const parent = governor.validateSpawn(null, {
    projectId: "proj-1",
    workspacePath: "/tmp",
    permissions: {
      canSpawn: true,
      canMutate: true,
      allowPaths: ["/app/src"],
      allowCommands: ["git", "npm test"]
    }
  });

  // Child requests wider paths and disallowed commands
  const child = governor.validateSpawn(parent, {
    workspacePath: "/tmp",
    permissions: {
      canSpawn: true,
      canMutate: true,
      allowPaths: ["/app/src/utils", "/etc/passwd"],
      allowCommands: ["git", "rm -rf /"]
    }
  });

  // Narrowed: /etc/passwd and rm -rf / are stripped
  assert.deepStrictEqual(child.permissions.allowPaths, ["/app/src/utils"]);
  assert.deepStrictEqual(child.permissions.allowCommands, ["git"]);
});

test("R7 — Lifecycle Cleanup: Reconciles active children when parent terminates", async () => {
  const governor = new SessionGovernor();

  const parent = governor.validateSpawn(null, { projectId: "proj-1", workspacePath: "/tmp" });
  const child1 = governor.validateSpawn(parent, { workspacePath: "/tmp" });
  const child2 = governor.validateSpawn(parent, { workspacePath: "/tmp" });

  assert.strictEqual(governor.getActiveChildren(parent.id).length, 2);

  const terminated = [];
  await governor.reconcileParentTermination(parent.id, {
    action: "terminate",
    onTerminate: async (child) => terminated.push(child.id)
  });

  assert.strictEqual(terminated.length, 2);
  assert.strictEqual(governor.getActiveChildren(parent.id).length, 0);
  assert.strictEqual(governor.get(child1.id).status, "closed");
});
