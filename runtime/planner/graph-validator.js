"use strict";

const { validateDAG } = require("./dag-utils");
const { createTaskGraphProposal, createSemanticTask } = require("./task-graph-proposal");

const GENERIC_TITLES = Object.freeze(["PLANNING", "SCAFFOLD", "IMPLEMENT", "TEST", "VERIFY"]);

class GraphValidator {
  static validate(proposal, options = {}) {
    if (!proposal || typeof proposal !== "object" || Array.isArray(proposal)) {
      return Object.freeze({
        valid: false,
        blockers: Object.freeze([{ code: "INVALID_PROPOSAL", message: "Proposal must be a non-array object" }]),
        warnings: Object.freeze([])
      });
    }

    const opts = options || {};
    const blockers = [];
    const warnings = [...(proposal.warnings || [])];
    const tasks = proposal.tasks || [];

    if (tasks.length === 0 && opts.requireTasks !== false) {
      blockers.push({ code: "EMPTY_TASK_GRAPH", message: "Proposal contains no tasks" });
    }

    const seenIds = new Set();
    for (const task of tasks) {
      if (seenIds.has(task.id)) {
        blockers.push({ code: "DUPLICATE_TASK_ID", message: `Duplicate task ID detected: ${task.id}`, taskId: task.id });
      }
      seenIds.add(task.id);

      if (typeof task.title === "string" && GENERIC_TITLES.includes(task.title.trim().toUpperCase())) {
        blockers.push({
          code: "GENERIC_TASK_TITLE_REJECTED",
          message: `Task title "${task.title}" is a generic workflow phase. Use a descriptive engineering title.`,
          taskId: task.id
        });
      }
    }

    const dagResult = validateDAG(tasks);
    if (!dagResult.valid) {
      for (const err of dagResult.errors) {
        blockers.push({ code: "DAG_VALIDATION_FAILED", message: err });
      }
    }

    for (const assumption of proposal.assumptions || []) {
      if (assumption && assumption.critical) {
        blockers.push({
          code: "CRITICAL_ASSUMPTION_REQUIRES_REFINEMENT",
          message: `Critical planning assumption requires mission refinement: ${assumption.text}`,
          dimension: assumption.dimension
        });
      }
    }

    if (options.missionBrief || options.taskRelevantContext) {
      GraphValidator._validateContextAuthority(tasks, options.missionBrief, options.taskRelevantContext, blockers, warnings);
    }

    const valid = blockers.length === 0;
    let normalizedProposal = null;
    if (valid) {
      normalizedProposal = GraphValidator._normalizeProposal(proposal);
      const postNormDag = validateDAG(normalizedProposal.tasks);
      if (!postNormDag.valid) {
        return Object.freeze({
          valid: false,
          blockers: Object.freeze([{ code: "POST_NORMALIZATION_DAG_FAILED", message: "DAG invalid after normalization" }]),
          warnings: Object.freeze(warnings),
          normalizedProposal: null
        });
      }
    }

    return Object.freeze({
      valid,
      blockers: Object.freeze(blockers),
      warnings: Object.freeze(warnings),
      normalizedProposal
    });
  }

  static _normalizeProposal(proposal) {
    const normalizedTasks = (proposal.tasks || []).map((t) =>
      createSemanticTask({
        ...t,
        title: t.title.trim(),
        objective: t.objective.trim()
      })
    );

    return createTaskGraphProposal({
      planningMode: proposal.planningMode,
      tasks: normalizedTasks,
      assumptions: proposal.assumptions,
      warnings: proposal.warnings,
      blockers: proposal.blockers,
      rationale: proposal.rationale
    });
  }

  static _validateContextAuthority(tasks, missionBrief, taskRelevantContext, blockers, warnings) {
    // Extended in Task 4
  }
}

module.exports = { GraphValidator };
