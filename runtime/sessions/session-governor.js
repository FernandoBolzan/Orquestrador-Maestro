"use strict";

const { createAgentSession } = require("./agent-session");

const DEFAULT_SPAWN_POLICY = Object.freeze({
  maxSpawnDepth: 3,
  maxChildrenPerSession: 5,
  defaultTtlMs: 60 * 60 * 1000 // 1 hour
});

class SessionGovernor {
  constructor(policy = {}) {
    this.policy = { ...DEFAULT_SPAWN_POLICY, ...policy };
    this.sessions = new Map(); // id -> AgentSession
    this.childrenByParent = new Map(); // parentId -> Set<childId>
  }

  register(session) {
    this.sessions.set(session.id, session);
    if (session.parentSessionId) {
      if (!this.childrenByParent.has(session.parentSessionId)) {
        this.childrenByParent.set(session.parentSessionId, new Set());
      }
      this.childrenByParent.get(session.parentSessionId).add(session.id);
    }
    return session;
  }

  get(id) {
    return this.sessions.get(id);
  }

  list(filters = {}) {
    let list = Array.from(this.sessions.values());
    if (filters.projectId) list = list.filter((s) => s.projectId === filters.projectId);
    if (filters.missionId) list = list.filter((s) => s.missionId === filters.missionId);
    if (filters.parentSessionId) list = list.filter((s) => s.parentSessionId === filters.parentSessionId);
    if (filters.status) list = list.filter((s) => s.status === filters.status);
    return list;
  }

  validateSpawn(parentSession, childRequest = {}) {
    if (parentSession) {
      const currentDepth = parentSession.depth || 0;
      if (currentDepth + 1 > this.policy.maxSpawnDepth) {
        const error = new Error(`Spawn depth limit reached (${this.policy.maxSpawnDepth})`);
        error.code = "SPAWN_DEPTH_EXCEEDED";
        throw error;
      }

      if (parentSession.permissions?.canSpawn === false) {
        const error = new Error("Parent session does not have permission to spawn child sessions");
        error.code = "PERMISSION_DENIED";
        throw error;
      }

      const activeChildren = this.getActiveChildren(parentSession.id);
      if (activeChildren.length >= this.policy.maxChildrenPerSession) {
        const error = new Error(`Maximum child sessions limit reached (${this.policy.maxChildrenPerSession})`);
        error.code = "CHILD_LIMIT_EXCEEDED";
        throw error;
      }
    }

    // Permission narrowing: child.permissions <= parent.permissions
    const narrowedPermissions = this.narrowPermissions(parentSession?.permissions, childRequest.permissions);

    const now = Date.now();
    const ttlMs = childRequest.ttlMs || this.policy.defaultTtlMs;
    const requestedExpiresAt = new Date(now + ttlMs).toISOString();

    let finalExpiresAt = requestedExpiresAt;
    if (parentSession?.expiresAt) {
      const parentExp = new Date(parentSession.expiresAt).getTime();
      if (new Date(requestedExpiresAt).getTime() > parentExp) {
        finalExpiresAt = parentSession.expiresAt;
      }
    }

    const depth = parentSession ? (parentSession.depth || 0) + 1 : 0;
    const rootSessionId = parentSession ? (parentSession.rootSessionId || parentSession.id) : (childRequest.id || undefined);

    const session = createAgentSession({
      ...childRequest,
      projectId: childRequest.projectId || parentSession?.projectId,
      missionId: childRequest.missionId || parentSession?.missionId,
      parentSessionId: parentSession?.id,
      rootSessionId,
      depth,
      expiresAt: finalExpiresAt,
      permissions: narrowedPermissions
    });

    return this.register(session);
  }

  narrowPermissions(parentPermissions = { canSpawn: true, canMutate: true }, requestedPermissions = {}) {
    const parent = parentPermissions || { canSpawn: true, canMutate: true };
    const child = requestedPermissions || {};

    const canSpawn = (parent.canSpawn !== false) && (child.canSpawn !== false);
    const canMutate = (parent.canMutate !== false) && (child.canMutate !== false);

    let allowPaths = child.allowPaths;
    if (parent.allowPaths) {
      if (child.allowPaths) {
        allowPaths = child.allowPaths.filter((p) => parent.allowPaths.some((pp) => p.startsWith(pp)));
      } else {
        allowPaths = [...parent.allowPaths];
      }
    }

    let allowCommands = child.allowCommands;
    if (parent.allowCommands) {
      if (child.allowCommands) {
        allowCommands = child.allowCommands.filter((cmd) => parent.allowCommands.includes(cmd));
      } else {
        allowCommands = [...parent.allowCommands];
      }
    }

    return {
      canSpawn,
      canMutate,
      ...(allowPaths ? { allowPaths } : {}),
      ...(allowCommands ? { allowCommands } : {})
    };
  }

  getActiveChildren(parentId) {
    const childIds = this.childrenByParent.get(parentId) || new Set();
    const children = [];
    for (const childId of childIds) {
      const child = this.sessions.get(childId);
      if (child && ["starting", "active", "idle", "running", "waiting_for_input"].includes(child.status)) {
        children.push(child);
      }
    }
    return children;
  }

  async reconcileParentTermination(parentId, { action = "terminate", onTerminate } = {}) {
    const children = this.getActiveChildren(parentId);
    const results = [];
    for (const child of children) {
      if (action === "terminate") {
        const nextStatus = "closed";
        const updated = createAgentSession({ ...child, status: nextStatus, completedAt: new Date().toISOString() });
        this.sessions.set(child.id, updated);
        if (typeof onTerminate === "function") {
          await onTerminate(child);
        }
        results.push(updated);
      } else if (action === "orphan") {
        const updated = createAgentSession({ ...child, status: "orphaned" });
        this.sessions.set(child.id, updated);
        results.push(updated);
      }
    }
    return results;
  }
}

module.exports = {
  DEFAULT_SPAWN_POLICY,
  SessionGovernor
};
