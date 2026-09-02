#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

class Adapter {
  constructor(name, options = {}) {
    this.name = name;
    this.memory = options.memory;
    this.projectId = options.projectId;
  }

  shouldRecord(event) {
    if (!event || !event.type) return false;
    
    const meaningfulTypes = [
      "tool_use",
      "file_edit",
      "file_create",
      "file_delete",
      "command_execute",
      "error",
      "decision",
      "discovery"
    ];
    
    return meaningfulTypes.includes(event.type);
  }

  normalizeEvent(rawEvent) {
    throw new Error("normalizeEvent must be implemented by subclass");
  }

  record(normalizedEvent) {
    if (!this.memory || !this.projectId) return null;
    
    const obs = this.memory.record(this.projectId, normalizedEvent);
    return obs;
  }

  processEvent(rawEvent) {
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
    const typeMap = {
      "tool_use": "implementation",
      "file_edit": "implementation",
      "file_create": "implementation",
      "file_delete": "implementation",
      "command_execute": "attempt",
      "error": "problem",
      "decision": "decision",
      "discovery": "discovery"
    };

    return {
      type: typeMap[rawEvent.type] || "discovery",
      summary: rawEvent.summary || rawEvent.description || `${rawEvent.type} event`,
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
    const typeMap = {
      "shell": "attempt",
      "file_edit": "implementation",
      "file_create": "implementation",
      "grep": "discovery",
      "read": "discovery",
      "error": "problem"
    };

    return {
      type: typeMap[rawEvent.type] || "discovery",
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
    const typeMap = {
      "bash": "attempt",
      "edit": "implementation",
      "write": "implementation",
      "glob": "discovery",
      "grep": "discovery",
      "read": "discovery",
      "error": "problem"
    };

    return {
      type: typeMap[rawEvent.type] || "discovery",
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
      type: rawEvent.type || "discovery",
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
  createAdapter
};