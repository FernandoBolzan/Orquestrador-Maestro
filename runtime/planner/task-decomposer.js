"use strict";

const { selectModel } = require("./model-router");
const { DeterministicFallbackPlanner } = require("./deterministic-fallback-planner");
const { LegacyExecutionProjection } = require("./legacy-execution-projection");

const TASK_TYPES = Object.freeze({
  PLANNING: "planning",
  SCAFFOLD: "scaffold",
  IMPLEMENT: "implement",
  STYLE: "style",
  TEST: "test",
  SHELL: "shell",
  REVIEW: "review",
  VERIFY: "verify"
});

function decompose(spec, options = {}) {
  const availableProviders = options.availableProviders || (options.provider ? [options.provider] : []);
  if (!availableProviders || availableProviders.length === 0) {
    throw new TypeError("MISSING_EXECUTION_TARGET: No available execution provider resolved");
  }

  const modelChoice = selectModel("medium", availableProviders);
  const providerId = options.provider || modelChoice?.provider;
  const model = options.model || modelChoice?.model || "default";

  if (!providerId || !availableProviders.includes(providerId)) {
    throw new TypeError("MISSING_EXECUTION_TARGET: No available execution provider resolved");
  }

  const executionTarget = { providerId, model };

  const missionBrief = {
    objective: spec?.answers?.intent || spec?.facts?.projectName || "task",
    requirements: []
  };

  const fallbackProposal = DeterministicFallbackPlanner.plan({
    missionBrief,
    taskRelevantContext: { items: [] },
    resolvedSkills: spec?.skills || []
  });

  return fallbackProposal.tasks.map((task) =>
    LegacyExecutionProjection.projectTask(task, { executionTarget })
  );
}

module.exports = { TASK_TYPES, decompose };
