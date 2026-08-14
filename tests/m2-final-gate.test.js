"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const { AiInterviewer } = require("../runtime/planner/ai-interviewer");
const { StructuredOutputError } = require("../runtime/planner/proposal-parser");

test("M2 Final Gate: --auto with parser failure throws and preserves spec", async () => {
  let callCount = 0;

  const mockApp = {
    providers: {
      get: (id) => ({
        detect: async () => ({ installed: true }),
        execute: async () => {
          callCount++;
          return { stdout: "invalid json response" };
        }
      })
    }
  };

  const interviewer = new AiInterviewer({
    resolvedSkills: [],
    preflightFacts: {},
    application: mockApp,
    intent: "crud",
    aiProvider: "opencode"
  });

  try {
    await interviewer.runBatch();
    assert.fail("Should have thrown");
  } catch (err) {
    assert.ok(err instanceof StructuredOutputError);
    assert.strictEqual(callCount, 3, "Should have retried 3 times");

    // Spec is preserved, but evaluateReadiness should say false due to incomplete dimensions
    const spec = interviewer.intentSpec;
    assert.strictEqual(spec.objective, "crud"); // Intact
    assert.strictEqual(spec.unknowns.length, 0); // Intact
  }
});

test("M2 Final Gate: --auto with provider crash throws immediately", async () => {
  const mockApp = {
    providers: {
      get: (id) => ({
        detect: async () => ({ installed: true }),
        execute: async () => {
          throw new Error("Provider crashed!");
        }
      })
    }
  };

  const interviewer = new AiInterviewer({
    resolvedSkills: [],
    preflightFacts: {},
    application: mockApp,
    intent: "crud",
    aiProvider: "opencode"
  });

  try {
    await interviewer.runBatch();
    assert.fail("Should have thrown");
  } catch (err) {
    assert.strictEqual(err.message, "Provider crashed!");
  }
});

test("M2 Final Gate: --auto passes if sufficient dimensions and no blockers", async () => {
  const mockApp = {
    providers: {
      get: (id) => ({
        detect: async () => ({ installed: true }),
        execute: async () => ({
          stdout: JSON.stringify({
            updates: { objective: "CRUD completo" },
            addRequirements: ["Req 1"],
            detectedUnknowns: [] // No blockers
          })
        })
      })
    }
  };

  const interviewer = new AiInterviewer({
    resolvedSkills: [],
    preflightFacts: {},
    application: mockApp,
    intent: "crud",
    aiProvider: "opencode"
  });

  const brief = await interviewer.runBatch();
  assert.strictEqual(brief.ambiguity, 0);
  assert.strictEqual(brief.answers.intent, "CRUD completo");
});
