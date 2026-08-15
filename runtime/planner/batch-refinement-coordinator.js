"use strict";

const { scheduleQuestions } = require("./question-scheduler.js");
const { BatchAnswerCollector } = require("./batch-answer-collector.js");
const { BatchAnswerApplier } = require("./batch-answer-applier.js");
const { IntentReconciler } = require("./intent-reconciler.js");

class BatchRefinementCoordinator {
  constructor({ discoverer, reconciler, adapter, applier } = {}) {
    this._discoverer = discoverer || null;
    this._reconciler = reconciler || new IntentReconciler();
    this._adapter = adapter || null;
    this._applier = applier || new BatchAnswerApplier();
    this._collector = new BatchAnswerCollector();
  }

  async run(intentSpec, context, skills, options = {}) {
    const auto = options.auto === true;
    const batchSize = options.batchSize || 4;

    const counters = {
      discoveryRounds: 0,
      batchCount: 0,
      questionCount: 0,
      reconciliationCalls: 0
    };

    let allQuestions = [];
    let currentSpec = { ...intentSpec };

    const discovery = await this._discoverer.discover(
      currentSpec.intent || currentSpec.objective,
      currentSpec,
      skills,
      context
    );
    counters.discoveryRounds = discovery.discoveryRound || 1;
    allQuestions = [...discovery.questions];

    if (!discovery.valid || allQuestions.length === 0) {
      const reconciliation = await this._reconciler.reconcile(currentSpec, [], context);
      counters.reconciliationCalls = this._reconciler.aiCalls || 0;
      if (reconciliation.success && reconciliation.proposal) {
        currentSpec = this._applyProposal(currentSpec, reconciliation.proposal);
      }
      return Object.freeze({
        success: true,
        cancelled: false,
        autoApproved: auto,
        reconciled: true,
        batchesProcessed: 0,
        totalQuestions: 0,
        intentSpec: Object.freeze(currentSpec),
        counters: Object.freeze(counters)
      });
    }

    const answers = new Map();
    let batchesProcessed = 0;
    let cancelled = false;

    while (true) {
      const activeQuestions = scheduleQuestions(allQuestions, answers, currentSpec, { batchSize });

      if (activeQuestions.length === 0) break;

      counters.questionCount += activeQuestions.length;

      if (auto) {
        for (const q of activeQuestions) {
          if (q.options && q.options.length > 0) {
            const recommended = q.options.find((o) => o.recommended);
            answers.set(q.id, recommended ? recommended.value : q.options[0].value);
          } else {
            answers.set(q.id, "auto");
          }
        }
        batchesProcessed++;
        counters.batchCount = batchesProcessed;
        continue;
      }

      this._collector.startBatch(activeQuestions);
      const batchResult = await this._adapter.collectBatch(activeQuestions, {
        batchNumber: batchesProcessed + 1,
        totalQuestions: allQuestions.length,
        answeredCount: answers.size
      });

      if (batchResult.action === "cancel") {
        cancelled = true;
        this._collector.cancelBatch();
        break;
      }

      for (const [qId, answer] of Object.entries(batchResult.answers || {})) {
        this._collector.recordAnswer(qId, answer);
      }

      const confirmed = this._collector.confirmBatch();
      for (const [qId, answer] of confirmed) {
        answers.set(qId, answer);
      }
      batchesProcessed++;
      counters.batchCount = batchesProcessed;
    }

    if (cancelled) {
      return Object.freeze({
        success: false,
        cancelled: true,
        autoApproved: false,
        reconciled: false,
        batchesProcessed,
        totalQuestions: counters.questionCount,
        intentSpec: Object.freeze(currentSpec),
        counters: Object.freeze(counters)
      });
    }

    const confirmedArray = [...answers.entries()].map(([qId, answer]) => {
      const question = allQuestions.find((q) => q.id === qId);
      return { questionId: qId, unknownId: question ? question.unknownId : null, answer };
    });

    currentSpec = this._applier.applyConfirmedAnswers(currentSpec, allQuestions, answers);

    const reconciliation = await this._reconciler.reconcile(currentSpec, confirmedArray, context);
    counters.reconciliationCalls = this._reconciler.aiCalls || 0;

    if (reconciliation.success && reconciliation.proposal) {
      currentSpec = this._applyProposal(currentSpec, reconciliation.proposal);
    }

    return Object.freeze({
      success: true,
      cancelled: false,
      autoApproved: auto,
      reconciled: reconciliation.success,
      batchesProcessed,
      totalQuestions: counters.questionCount,
      intentSpec: Object.freeze(currentSpec),
      counters: Object.freeze(counters)
    });
  }

  _applyProposal(intentSpec, proposal) {
    const newSpec = { ...intentSpec };

    if (proposal.objective) {
      newSpec.objective = proposal.objective;
    }

    if (Array.isArray(proposal.addRequirements)) {
      const reqSet = new Set([...(intentSpec.requirements || []), ...proposal.addRequirements]);
      newSpec.requirements = [...reqSet];
    }

    if (Array.isArray(proposal.addConstraints)) {
      const conSet = new Set([...(intentSpec.constraints || []), ...proposal.addConstraints]);
      newSpec.constraints = [...conSet];
    }

    if (Array.isArray(proposal.detectedUnknowns) && proposal.detectedUnknowns.length > 0) {
      const existingIds = new Set((intentSpec.unknowns || []).map((u) => u.id));
      const newUnknowns = proposal.detectedUnknowns.filter((u) => !existingIds.has(u.id));
      newSpec.unknowns = [...(intentSpec.unknowns || []), ...newUnknowns];
    }

    newSpec.updatedAt = new Date().toISOString();
    return newSpec;
  }
}

module.exports = { BatchRefinementCoordinator };
