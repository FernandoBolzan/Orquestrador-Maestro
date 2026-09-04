#!/usr/bin/env node
"use strict";

const KNOWN_SCOPE_LEVELS = new Set(["repository", "branch", "workspace", "commit", "task"]);
const REQUIRED_FIELDS = {
  repository: [],
  branch: ["branch"],
  workspace: ["workspaceId"],
  commit: ["headCommit"],
  task: ["taskId"]
};

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateObservationScope(scope) {
  if (!scope || typeof scope !== "object") {
    throw new Error("Scope is required");
  }
  if (!scope.level || !KNOWN_SCOPE_LEVELS.has(scope.level)) {
    throw new Error(`Invalid observation scope level: ${scope.level}`);
  }
  const required = REQUIRED_FIELDS[scope.level] || [];
  for (const field of required) {
    if (!isNonEmptyString(scope[field])) {
      throw new Error(`Scope missing required field '${field}' for level '${scope.level}'`);
    }
  }
  if (scope.repositoryId && !isNonEmptyString(scope.repositoryId)) {
    throw new Error(`Scope field 'repositoryId' must be a non-empty string when present`);
  }
  if (scope.branch && !isNonEmptyString(scope.branch)) {
    throw new Error(`Scope field 'branch' must be a non-empty string when present`);
  }
  if (scope.workspaceId && !isNonEmptyString(scope.workspaceId)) {
    throw new Error(`Scope field 'workspaceId' must be a non-empty string when present`);
  }
  if (scope.headCommit && !isNonEmptyString(scope.headCommit)) {
    throw new Error(`Scope field 'headCommit' must be a non-empty string when present`);
  }
  if (scope.taskId && !isNonEmptyString(scope.taskId)) {
    throw new Error(`Scope field 'taskId' must be a non-empty string when present`);
  }
  return true;
}

function isObservationVisible(observation, currentContext, options = {}) {
  if (!observation || !observation.scope) return false;
  if (!currentContext) return false;

  const obsScope = observation.scope;
  const level = obsScope.level;

  switch (level) {
    case "repository":
      return obsScope.repositoryId === currentContext.repositoryId;

    case "branch":
      if (obsScope.repositoryId !== currentContext.repositoryId) return false;
      if (currentContext.detached) return false;
      if (options.taskId) {
        return obsScope.branch === currentContext.branch && obsScope.taskId === options.taskId;
      }
      return obsScope.branch === currentContext.branch;

    case "workspace":
      if (obsScope.repositoryId !== currentContext.repositoryId) return false;
      return obsScope.workspaceId === currentContext.workspaceId;

    case "task":
      if (obsScope.repositoryId !== currentContext.repositoryId) return false;
      if (!options.taskId) return false;
      return obsScope.taskId === options.taskId;

    case "commit":
      if (obsScope.repositoryId !== currentContext.repositoryId) return false;
      if (options.allowAncestry && currentContext.headCommit && obsScope.headCommit) {
        try {
          const { isAncestor } = require("./git-context.js");
          return isAncestor(
            currentContext.projectRoot,
            obsScope.headCommit,
            currentContext.headCommit
          );
        } catch {
          return obsScope.headCommit === currentContext.headCommit;
        }
      }
      return obsScope.headCommit === currentContext.headCommit;

    default:
      return false;
  }
}

function resolveObservationScope({ type, gitContext, taskId, explicitScope }) {
  if (explicitScope && explicitScope.level) {
    const scope = { level: explicitScope.level };
    if (gitContext) {
      scope.repositoryId = gitContext.repositoryId;
      scope.branch = gitContext.branch;
      scope.workspaceId = gitContext.workspaceId;
      scope.headCommit = gitContext.headCommit;
    }
    if (taskId) scope.taskId = taskId;
    if (explicitScope.repositoryId) scope.repositoryId = explicitScope.repositoryId;
    if (explicitScope.branch) scope.branch = explicitScope.branch;
    if (explicitScope.workspaceId) scope.workspaceId = explicitScope.workspaceId;
    if (explicitScope.headCommit) scope.headCommit = explicitScope.headCommit;
    if (explicitScope.taskId) scope.taskId = explicitScope.taskId;
    try {
      validateObservationScope(scope);
      return scope;
    } catch {
      return null;
    }
  }

  const defaultScopeByType = {
    decision: "branch",
    discovery: "branch",
    problem: "branch",
    implementation: "branch",
    verification: "branch",
    risk: "branch",
    dependency: "branch",
    attempt: "task",
    failure: "branch",
    environment: "workspace",
    workaround: "workspace"
  };

  let level = defaultScopeByType[type] || "branch";

  if (!gitContext) {
    const fallbackScope = {
      level: "repository",
      repositoryId: type ? `${String(type)}_local` : "local"
    };
    if (type === "environment") {
      fallbackScope.level = "workspace";
      fallbackScope.workspaceId = "local-workspace";
    }
    try {
      validateObservationScope(fallbackScope);
      return fallbackScope;
    } catch {
      return { level: "repository" };
    }
  }

  if (gitContext.detached && level === "branch") {
    level = "commit";
  }

  if (level === "task" && !taskId) {
    level = gitContext.detached ? "commit" : "branch";
  }

  const scope = { level };

  scope.repositoryId = gitContext.repositoryId;
  scope.branch = gitContext.branch;
  scope.workspaceId = gitContext.workspaceId;
  scope.headCommit = gitContext.headCommit;
  if (taskId) scope.taskId = taskId;

  try {
    validateObservationScope(scope);
    return scope;
  } catch {
    return null;
  }
}

function rankObservations(observations, taskTokens, currentContext, options = {}) {
  return observations.map(obs => {
    let score = 0;
    const blockers = [];

    if (!isObservationVisible(obs, currentContext, options)) {
      return { obs, score: -1, blocked: true, reason: "visibility blocked" };
    }

    if (obs.verified) score += 10;

    const obsTokens = tokenizeRank(
      (obs.summary || "") + " " +
      (obs.details || "") + " " +
      (obs.tags || []).join(" ")
    );

    for (const t of taskTokens) {
      if (obsTokens.includes(t)) score += 5;
      if ((obs.tags || []).some(tag => tag.toLowerCase().includes(t))) score += 3;
    }

    if (obs.scope) {
      if (obs.scope.level === "branch" && obs.scope.branch === currentContext.branch) score += 4;
      if (obs.scope.level === "workspace" && obs.scope.workspaceId === currentContext.workspaceId) score += 2;
      if (obs.scope.level === "repository") score += 1;
      if (obs.scope.level === "task" && obs.scope.taskId === options.taskId) score += 6;
    }

    if (obs.timestamp) {
      const age = (Date.now() - new Date(obs.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      if (age < 1) score += 3;
      else if (age < 7) score += 2;
      else if (age < 30) score += 1;
    }

    return { obs, score, blocked: false };
  })
  .filter(r => !r.blocked && r.score > 0)
  .sort((a, b) => b.score - a.score);
}

function tokenizeRank(text) {
  if (!text || typeof text !== "string") return [];
  const STOP_WORDS = new Set([
    "the", "and", "that", "this", "with", "for", "from", "are", "was",
    "para", "com", "uma", "um", "dos", "das", "que", "por", "mais",
    "continue", "continuar", "fazer", "ajustar", "using", "used",
    "have", "has", "had", "was", "were", "been", "being"
  ]);
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(token => token.length >= 3 && !STOP_WORDS.has(token));
}

module.exports = {
  KNOWN_SCOPE_LEVELS,
  REQUIRED_FIELDS,
  isObservationVisible,
  resolveObservationScope,
  rankObservations,
  tokenizeRank,
  validateObservationScope
};
