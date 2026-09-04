const { describe, it, expect, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const { Memory } = require("../orquestrador/bin/memory.js");
const { ClaudeAdapter, CodexAdapter, OpenCodeAdapter, GenericAdapter, createAdapter } = require("../orquestrador/adapters/index.js");

describe("Adapters", () => {
  let tmpDir;
  let memory;
  let projectId;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "adapter-test-"));
    memory = new Memory({ baseDir: tmpDir });
    projectId = "test-project";
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("createAdapter", () => {
    it("should create Claude adapter", () => {
      const adapter = createAdapter("claude", { memory, projectId });
      assert.ok(adapter instanceof ClaudeAdapter);
      assert.equal(adapter.name, "claude");
    });

    it("should create Codex adapter", () => {
      const adapter = createAdapter("codex", { memory, projectId });
      assert.ok(adapter instanceof CodexAdapter);
      assert.equal(adapter.name, "codex");
    });

    it("should create OpenCode adapter", () => {
      const adapter = createAdapter("opencode", { memory, projectId });
      assert.ok(adapter instanceof OpenCodeAdapter);
      assert.equal(adapter.name, "opencode");
    });

    it("should create generic adapter for unknown tool", () => {
      const adapter = createAdapter("unknown-tool", { memory, projectId });
      assert.ok(adapter instanceof GenericAdapter);
      assert.equal(adapter.name, "unknown-tool");
    });
  });

  describe("shouldRecord", () => {
    it("should record meaningful events", () => {
      const adapter = createAdapter("claude", { memory, projectId });

      assert.ok(adapter.shouldRecord({ type: "tool_use" }));
      assert.ok(adapter.shouldRecord({ type: "file_edit" }));
      assert.ok(adapter.shouldRecord({ type: "error" }));
      assert.ok(adapter.shouldRecord({ type: "decision" }));
    });

    it("should not record trivial events", () => {
      const adapter = createAdapter("claude", { memory, projectId });

      assert.ok(!adapter.shouldRecord({ type: "read" }));
      assert.ok(!adapter.shouldRecord({ type: "search" }));
      assert.ok(!adapter.shouldRecord(null));
      assert.ok(!adapter.shouldRecord({}));
    });
  });

  describe("processEvent", () => {
    it("should process and record event", () => {
      const adapter = createAdapter("claude", { memory, projectId });

      const obs = adapter.processEvent({
        type: "file_edit",
        summary: "Updated authentication logic",
        file_path: "src/auth.ts",
        session_id: "session-123"
      });

      assert.ok(obs);
      assert.equal(obs.type, "implementation");
      assert.ok(obs.summary.includes("Updated authentication logic"));
      assert.ok(obs.files.includes("src/auth.ts"));
      assert.equal(obs.source.tool, "claude");
    });

    it("should return null for non-meaningful events", () => {
      const adapter = createAdapter("claude", { memory, projectId });

      const obs = adapter.processEvent({
        type: "read",
        file_path: "src/auth.ts"
      });

      assert.equal(obs, null);
    });
  });

  describe("ClaudeAdapter", () => {
    it("should normalize Claude events", () => {
      const adapter = new ClaudeAdapter({ memory, projectId });

      const normalized = adapter.normalizeEvent({
        type: "tool_use",
        summary: "Used bash command",
        command: "npm test",
        session_id: "session-123"
      });

      assert.equal(normalized.type, "implementation");
      assert.ok(normalized.summary.includes("Used bash command"));
      assert.equal(normalized.source.tool, "claude");
    });
  });

  describe("CodexAdapter", () => {
    it("should normalize Codex events", () => {
      const adapter = new CodexAdapter({ memory, projectId });

      const normalized = adapter.normalizeEvent({
        type: "shell",
        summary: "Ran npm install",
        command: "npm install",
        session_id: "session-456"
      });

      assert.equal(normalized.type, "attempt");
      assert.ok(normalized.summary.includes("Ran npm install"));
      assert.equal(normalized.source.tool, "codex");
    });
  });

  describe("OpenCodeAdapter", () => {
    it("should normalize OpenCode events", () => {
      const adapter = new OpenCodeAdapter({ memory, projectId });

      const normalized = adapter.normalizeEvent({
        type: "bash",
        summary: "Ran tests",
        command: "npm test",
        session_id: "session-789"
      });

      assert.equal(normalized.type, "attempt");
      assert.ok(normalized.summary.includes("Ran tests"));
      assert.equal(normalized.source.tool, "opencode");
    });
  });

  describe("integration with memory", () => {
    it("should store observations in memory", () => {
      const adapter = createAdapter("claude", { memory, projectId });

      adapter.processEvent({
        type: "file_edit",
        summary: "Fixed authentication bug",
        file_path: "src/auth.ts"
      });

      const observations = memory.search(projectId);
      assert.equal(observations.length, 1);
      assert.ok(observations[0].summary.includes("Fixed authentication bug"));
    });

    it("should isolate projects", () => {
      const adapter1 = createAdapter("claude", { memory, projectId: "project-a" });
      const adapter2 = createAdapter("claude", { memory, projectId: "project-b" });

      adapter1.processEvent({ type: "file_edit", summary: "Project A change" });
      adapter2.processEvent({ type: "file_edit", summary: "Project B change" });

      const obsA = memory.search("project-a");
      const obsB = memory.search("project-b");

      assert.equal(obsA.length, 1);
      assert.equal(obsB.length, 1);
      assert.ok(obsA[0].summary.includes("Project A"));
      assert.ok(obsB[0].summary.includes("Project B"));
    });
  });
});