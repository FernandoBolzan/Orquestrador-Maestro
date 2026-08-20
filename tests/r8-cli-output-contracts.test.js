"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { createCommandResult } = require("../runtime/cli/command-result");
const { OutputRenderer, toToon } = require("../runtime/cli/output-renderer");

test("R8 — CommandResult: Encapsulates ok, data, error, and metadata", () => {
  const result = createCommandResult({
    ok: true,
    data: { runId: "run-123", status: "completed" },
    message: "Run finished"
  });

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.data.runId, "run-123");
  assert.strictEqual(result.message, "Run finished");
  assert.ok(result.metadata.timestamp);
});

test("R8 — OutputRenderer: Renders JSON and JSONL correctly", () => {
  const sample = [{ id: "item-1", name: "Alpha" }, { id: "item-2", name: "Beta" }];

  const jsonOut = OutputRenderer.render(sample, "json");
  assert.deepStrictEqual(JSON.parse(jsonOut), sample);

  const jsonlOut = OutputRenderer.render(sample, "jsonl");
  const lines = jsonlOut.trim().split("\n");
  assert.strictEqual(lines.length, 2);
  assert.strictEqual(JSON.parse(lines[0]).id, "item-1");
  assert.strictEqual(JSON.parse(lines[1]).id, "item-2");
});

test("R8 — OutputRenderer: Renders TOON compact format and Human format", () => {
  const data = {
    projectId: "omnia-builder",
    status: "active",
    tasksCount: 5,
    tags: ["frontend", "react"]
  };

  const toonOut = OutputRenderer.render(data, "toon");
  assert.ok(toonOut.includes("projectId: omnia-builder"));
  assert.ok(toonOut.includes("status: active"));
  assert.ok(toonOut.includes("tasksCount: 5"));

  const humanOut = OutputRenderer.render(data, "human");
  assert.ok(humanOut.includes("projectId: omnia-builder"));
});
