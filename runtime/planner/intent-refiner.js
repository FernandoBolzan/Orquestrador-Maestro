"use strict";

const { createIntentSpec, isValidTransition } = require("./intent-spec");
const { parseRefinementProposal } = require("./proposal-parser");
const { validateProposal, applyProposal } = require("./proposal-validator");
const { evaluateReadiness } = require("./readiness-evaluator");

class IntentRefiner {
  constructor({ aiProvider, application, taskRelevantContext }) {
    this.providerId = aiProvider;
    this.app = application;
    this.context = taskRelevantContext;
  }

  async refine(intentSpec) {
    if (!isValidTransition(intentSpec.status, "REFINING")) {
      // Just a safety check, we'll force it for now
    }

    const provider = this.app.providers.get(this.providerId);
    if (!provider) {
      return intentSpec; // fallback to unchanged if no provider
    }

    try {
      const isInstalled = await provider.detect();
      if (!isInstalled.installed) return intentSpec;
    } catch (e) {
      return intentSpec;
    }

    const systemPrompt = `You are a Senior Software Architect. Return ONLY a JSON object of type RefinementProposal.
Intent: ${intentSpec.objective || intentSpec.intent}
Context: ${JSON.stringify(this.context)}

If the intent is vague, propose detectedUnknowns with blocking: true.
Schema:
{
  "updates": { "objective": "string" },
  "addRequirements": ["string"],
  "addConstraints": ["string"],
  "detectedUnknowns": [{ "id": "string", "dimension": "string", "description": "string", "status": "OPEN", "blocking": true }],
  "question": null,
  "recommendation": null
}`;

    let lastError = null;
    let validProposal = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      let result;
      try {
        result = await provider.execute({
          prompt: systemPrompt,
          model: "default",
          workspacePath: process.cwd()
        });
      } catch (e) {
        throw e; // Provider failure is atomic, bubbles up immediately
      }

      let parsed;
      try {
        parsed = parseRefinementProposal(result.stdout || "");
        validProposal = validateProposal(parsed, intentSpec, this.context);
        break; // Success!
      } catch (e) {
        lastError = e;
        // Continue to retry on parser/validation failure
      }
    }

    if (!validProposal) {
      throw lastError; // Exhausted retries, ABORT
    }

    const newSpec = applyProposal(intentSpec, validProposal);

    return newSpec;
  }
}

module.exports = {
  IntentRefiner
};
