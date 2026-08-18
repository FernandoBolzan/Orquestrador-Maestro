"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { extractAssistantText } = require("../runtime/providers/provider-output");

const FIXTURES = path.join(__dirname, "fixtures", "ndjson");
function fixture(name) { return fs.readFileSync(path.join(FIXTURES, name), "utf8"); }

function parseFencedJson(raw) {
  return JSON.parse(raw.replace(/```(?:json)?\s*|\s*```/gu, "").trim());
}

test("codex exec --json: reasoning lines never contaminate the answer", () => {
  const output = extractAssistantText(fixture("codex-exec.jsonl"));
  assert.ok(!output.includes("The user wants an isolated worktree"), "reasoning text must be dropped");
  assert.ok(!output.includes("copyWorkingTreeState"), "second reasoning line must be dropped");
  assert.ok(output.includes("{\"ok\":true}"), "agent_message text must survive");
  assert.deepEqual(parseFencedJson(output), { ok: true });
});

test("claude stream-json: only text blocks/deltas are kept, reasoning blocks dropped", () => {
  const output = extractAssistantText(fixture("claude-stream.jsonl"));
  assert.ok(!output.includes("The user asked about worktrees"), "reasoning block must be dropped");
  assert.ok(output.includes("Vou remover o worktree ao encerrar a sessão."));
  assert.ok(!output.includes("message_start") && !output.includes("content_block"), "event envelopes must not leak");
  assert.ok(!output.includes("thinking"), "raw thinking field must not leak");
});

test("opencode NDJSON: text parts stream into the answer", () => {
  const output = extractAssistantText(fixture("opencode.jsonl"));
  assert.ok(output.includes("\"proposal\":\"ok\""));
  assert.ok(!output.includes("step_start"), "step events must be ignored");
});

test("codex reasoning-only stream yields no text and falls back to raw stdout", () => {
  const reasoningOnly = [
    JSON.stringify({ seq: 1, type: "reasoning", item: { type: "reasoning", text: "thinking..." } })
  ].join("\n");
  assert.equal(extractAssistantText(reasoningOnly), reasoningOnly);
});