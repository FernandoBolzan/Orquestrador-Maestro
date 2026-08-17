"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  resolveOutcomes,
  FAILED_DEPENDENCY_REASON
} = require("../runtime/runs/task-outcome-resolution");

const tasks = [
  { id: "a", dependsOn: [] },
  { id: "b", dependsOn: ["a"] },
  { id: "c", dependsOn: [] },
  { id: "d", dependsOn: ["b"] }
];

test("F5.3 resolve falha, bloqueio transitivo e sucesso sem pending eterno", () => {
  const results = new Map([
    ["a", { status: "failed", error: "boom" }],
    ["b", { status: "failed", error: "blocked by failed dependency: a" }],
    ["c", { status: "completed" }],
    ["d", { status: "failed", error: "blocked by failed dependency: b" }]
  ]);
  const outcomes = resolveOutcomes({ tasks, results });
  assert.equal(outcomes.size, tasks.length);
  assert.deepEqual(outcomes.get("a"), { status: "failed", blockedBy: [], error: "boom" });
  assert.deepEqual(outcomes.get("b"), { status: "blocked", reason: FAILED_DEPENDENCY_REASON, blockedBy: ["a"] });
  assert.deepEqual(outcomes.get("d"), { status: "blocked", reason: FAILED_DEPENDENCY_REASON, blockedBy: ["b"] });
  assert.deepEqual(outcomes.get("c"), { status: "completed", blockedBy: [] });
  assert.ok([...outcomes.values()].every((entry) => entry.status !== "pending"));
  assert.deepEqual([...resolveOutcomes({ tasks, results })], [...outcomes]);
});

test("F5.3 rejeita resultado incompleto", () => {
  assert.throws(
    () => resolveOutcomes({ tasks: [{ id: "x", dependsOn: [] }], results: new Map() }),
    /INCOMPLETE_EXECUTION_RESULTS/
  );
});
