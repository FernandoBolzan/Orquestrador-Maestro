#!/usr/bin/env node
"use strict";

const { resolveGitContext } = require("../lib/git-context.js");
const { resolveObservationScope, validateObservationScope } = require("../lib/visibility.js");

const DEFAULT_OBSERVATION_TYPE_MAP = {
  tool_use: "implementation",
  file_edit: "implementation",
  file_create: "implementation",
  file_delete: "implementation",
  edit: "implementation",
  write: "implementation",

  command_execute: "attempt",
  shell: "attempt",
  bash: "attempt",

  error: "problem",

  decision: "decision",
  discovery: "discovery"
};

class Adapter {
  constructor(name, options = {}) {
    this.name = name;
    this.memory = options.memory;
    this.projectId = options.projectId;
    this.projectRoot = options.projectRoot || null;
    this.gitContext = options.gitContext || (this.projectRoot ? resolveGitContext(this.projectRoot) : null);
    this.taskId = options.taskId || null;
  }

  shouldRecord(event) {
    if (!event || !event.type) return false;

    const noisyTypes = new Set([
      "read", "grep", "glob", "ls", "pwd", "cat", "search"
    ]);

    if (noisyTypes.has(event.type)) return false;

    return Object.hasOwn(DEFAULT_OBSERVATION_TYPE_MAP, event.type) || !!event.type;
  }

  normalizeEvent(rawEvent) {
    throw new Error("normalizeEvent must be implemented by subclass");
  }

  record(normalizedEvent) {
    if (!this.memory || !this.projectId) return null;

    const opts = {};
    if (this.projectRoot) opts.projectRoot = this.projectRoot;
    if (this.gitContext) opts.gitContext = this.gitContext;
    if (this.taskId && !normalizedEvent.taskId) normalizedEvent.taskId = this.taskId;

    const resolvedScope = resolveObservationScope({
      type: normalizedEvent.type,
      gitContext: this.gitContext || (this.projectRoot ? resolveGitContext(this.projectRoot) : null),
      taskId: normalizedEvent.taskId || this.taskId || null,
      explicitScope: normalizedEvent.scope || null
    });
    if (!resolvedScope) {
      throw new Error(`Adapter ${this.name} cannot build a valid observation scope for ${normalizedEvent.type}`);
    }
    normalizedEvent.scope = resolvedScope;
    try {
      validateObservationScope(normalizedEvent.scope);
    } catch (error) {
      throw new Error(`Adapter ${this.name} produced invalid scope: ${error.message}`);
    }

    const obs = this.memory.record(this.projectId, normalizedEvent, opts);
    return obs;
  }

  processEvent(rawEvent) {
    if (!rawEvent || typeof rawEvent !== "object") return null;
    if (!this.shouldRecord(rawEvent)) return null;

    const normalized = this.normalizeEvent(rawEvent);
    return this.record(normalized);
  }
}

class ClaudeAdapter extends Adapter {
  constructor(options = {}) {
    super("claude", options);
  }

  normalizeEvent(rawEvent) {
    return {
      type: DEFAULT_OBSERVATION_TYPE_MAP[rawEvent.type] || "discovery",
      summary: rawEvent.summary ?? rawEvent.description ?? `${rawEvent.type} event`,
      details: rawEvent.details || rawEvent.content || null,
      files: rawEvent.files || (rawEvent.file_path ? [rawEvent.file_path] : []),
      tags: rawEvent.tags || [this.name, rawEvent.type],
      source: {
        tool: this.name,
        session: rawEvent.session_id,
        commit: rawEvent.commit
      }
    };
  }
}

class CodexAdapter extends Adapter {
  constructor(options = {}) {
    super("codex", options);
  }

  normalizeEvent(rawEvent) {
    return {
      type: DEFAULT_OBSERVATION_TYPE_MAP[rawEvent.type] || "discovery",
      summary: rawEvent.summary || `${rawEvent.type} operation`,
      details: rawEvent.details || rawEvent.command || null,
      files: rawEvent.files || (rawEvent.file_path ? [rawEvent.file_path] : []),
      tags: rawEvent.tags || [this.name, rawEvent.type],
      source: {
        tool: this.name,
        session: rawEvent.session_id,
        commit: rawEvent.commit
      }
    };
  }
}

class OpenCodeAdapter extends Adapter {
  constructor(options = {}) {
    super("opencode", options);
  }

  normalizeEvent(rawEvent) {
    return {
      type: DEFAULT_OBSERVATION_TYPE_MAP[rawEvent.type] || "discovery",
      summary: rawEvent.summary || `${rawEvent.type} operation`,
      details: rawEvent.details || rawEvent.command || null,
      files: rawEvent.files || (rawEvent.filePath ? [rawEvent.filePath] : []),
      tags: rawEvent.tags || [this.name, rawEvent.type],
      source: {
        tool: this.name,
        session: rawEvent.session_id,
        commit: rawEvent.commit
      }
    };
  }
}

class GenericAdapter extends Adapter {
  constructor(options = {}) {
    super(options.name || "generic", options);
  }

  normalizeEvent(rawEvent) {
    return {
      type: DEFAULT_OBSERVATION_TYPE_MAP[rawEvent.type] || "discovery",
      summary: rawEvent.summary || rawEvent.description || "Event captured",
      details: rawEvent.details || null,
      files: rawEvent.files || [],
      tags: rawEvent.tags || [this.name],
      source: {
        tool: this.name,
        session: rawEvent.session_id,
        commit: rawEvent.commit
      }
    };
  }
}

function createAdapter(toolName, options = {}) {
  switch (toolName.toLowerCase()) {
    case "claude":
      return new ClaudeAdapter(options);
    case "codex":
      return new CodexAdapter(options);
    case "opencode":
      return new OpenCodeAdapter(options);
    default:
      return new GenericAdapter({ ...options, name: toolName });
  }
}

module.exports = {
  Adapter,
  ClaudeAdapter,
  CodexAdapter,
  OpenCodeAdapter,
  GenericAdapter,
  createAdapter,
  DEFAULT_OBSERVATION_TYPE_MAP
};
