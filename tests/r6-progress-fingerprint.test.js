"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { createProgressFingerprint, isProgressMaterial } = require("../runtime/verification/progress-fingerprint");
const { ProgressEvaluator } = require("../runtime/verification/execution-control");

test("R6 — ProgressFingerprint: Distinguishes material changes from static states", () => {
  const fp1 = createProgressFingerprint({
    failingTests: ["test-auth.js"],
    changedFiles: ["src/auth.js"],
    verification: { status: "failed", checks: [{ exitCode: 1 }] }
  });

  const fp2 = createProgressFingerprint({
    failingTests: ["test-auth.js"],
    changedFiles: ["src/auth.js"],
    verification: { status: "failed", checks: [{ exitCode: 1 }] }
  });

  const fp3 = createProgressFingerprint({
    failingTests: [],
    changedFiles: ["src/auth.js", "src/token.js"],
    verification: { status: "passed", checks: [{ exitCode: 0 }] }
  });

  assert.strictEqual(fp1.compositeHash, fp2.compositeHash);
  assert.strictEqual(isProgressMaterial(fp1, fp2), false);
  assert.notStrictEqual(fp1.compositeHash, fp3.compositeHash);
  assert.strictEqual(isProgressMaterial(fp1, fp3), true);
});

test("R6 — ProgressEvaluator: Detects STALLED state when no material progress across window", () => {
  const evaluator = new ProgressEvaluator({ noProgressWindow: 3, maxAttempts: 5 });

  // Record 3 identical attempts (same failing test and no file changes)
  evaluator.recordAttempt({ failingTests: ["test-foo.js"], changedFiles: [] });
  evaluator.recordAttempt({ failingTests: ["test-foo.js"], changedFiles: [] });
  evaluator.recordAttempt({ failingTests: ["test-foo.js"], changedFiles: [] });

  assert.strictEqual(evaluator.isStalled(), true);

  const outcome = evaluator.evaluate({ allTasksCompleted: false });
  assert.strictEqual(outcome.outcome, "STALLED");
  assert.ok(outcome.reason.includes("Nenhum progresso material"));
});

test("R6 — Invariant: Agent completed != Task completed (Verification must pass)", () => {
  const evaluator = new ProgressEvaluator();

  // Agent claims all tasks completed, but verification failed
  const outcomeWithoutVerification = evaluator.evaluate({
    allTasksCompleted: true,
    verificationOk: false
  });
  assert.strictEqual(outcomeWithoutVerification.outcome, "NEEDS_ATTENTION");

  // Only when verification passes is the mission marked COMPLETED
  const outcomeWithVerification = evaluator.evaluate({
    allTasksCompleted: true,
    verificationOk: true
  });
  assert.strictEqual(outcomeWithVerification.outcome, "COMPLETED");
});
