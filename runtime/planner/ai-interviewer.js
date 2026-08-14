"use strict";

const p = require("@clack/prompts");
const { DynamicInterviewer } = require("./dynamic-interviewer");
const { createIntentSpec } = require("./intent-spec");
const { IntentRefiner } = require("./intent-refiner");
const { evaluateReadiness } = require("./readiness-evaluator");

class AiInterviewer {
  constructor({ resolvedSkills, preflightFacts, application, intent, aiProvider = "opencode" }) {
    this.resolvedSkills = resolvedSkills;
    this.facts = preflightFacts;
    this.app = application;
    this.intent = intent;
    this.aiProvider = aiProvider;
    this.conversationHistory = [];
    this.intentSpec = createIntentSpec(intent);
    this.refiner = new IntentRefiner({
      aiProvider,
      application,
      taskRelevantContext: { items: Object.entries(preflightFacts || {}).map(([k, v]) => ({ key: k, value: v, type: "FACT" })) }
    });
  }

  async runInteractive() {
    const provider = this.app.providers.get(this.aiProvider);
    let fallbackToLegacy = false;

    if (!provider) {
      fallbackToLegacy = true;
    } else {
      try {
        const installation = await provider.detect();
        if (!installation.installed) {
          fallbackToLegacy = true;
        }
      } catch (e) {
        fallbackToLegacy = true;
      }
    }

    if (fallbackToLegacy) {
      p.note(`Provedor de IA (${this.aiProvider}) não detectado. Usando modo de refinamento por heurística.`, "Fallback");
      const fallback = new DynamicInterviewer({ resolvedSkills: this.resolvedSkills, preflightFacts: this.facts });
      return fallback.runInteractive();
    }

    p.note(`Assistente Inteligente ativado (${this.aiProvider}). Analisando projeto e skills...`, "AI Planner");

    let isReady = false;
    const s = p.spinner();

    while (!isReady) {
       try {
         s.start("IA analisando intenção...");
         this.intentSpec = await this.refiner.refine(this.intentSpec);
       } catch (e) {
         require("@clack/prompts").log.error(`Falha no refinamento via IA: ${e.message}`);
         throw e;
       } finally {
         s.stop();
       }

       const evalResult = evaluateReadiness(this.intentSpec);
       if (evalResult.ready) {
         isReady = true;
         break;
       }

       // We have blockers. Just ask the first one for now (naive UI)
       const blocker = evalResult.blockers[0];

       const answer = await p.text({
          message: `[AI] Esclareça a seguinte pendência (${blocker.dimension}): ${blocker.description}`,
          placeholder: "Sua resposta (ou 'skip' para prosseguir)"
       });

       if (p.isCancel(answer) || answer === "skip" || answer === "q" || answer.trim() === "") {
         break; // user skipped, we might still be not ready but we stop
       }

       // Convert user answer to a user decision and resolve the unknown
       this.intentSpec.userDecisions.push(`Decided [${blocker.dimension}]: ${answer}`);
       const targetUnknown = this.intentSpec.unknowns.find(u => u.dimension === blocker.dimension);
       if (targetUnknown) {
         targetUnknown.status = "RESOLVED";
       }
    }

    return this.buildSpec();
  }

  async runBatch() {
    // Run exactly one refinement step
    try {
      this.intentSpec = await this.refiner.refine(this.intentSpec);
    } catch (e) {
      throw e;
    }

    const evalResult = evaluateReadiness(this.intentSpec);
    if (!evalResult.ready) {
      throw new Error("Falta informacao bloqueante e --auto foi fornecido. Blockers: " + evalResult.blockers.map(b => b.description).join(", "));
    }

    return this.buildSpec();
  }

  buildSpec() {
    return Object.freeze({
      ambiguity: evaluateReadiness(this.intentSpec).ready ? 0 : 1,
      facts: this.facts,
      skills: this.resolvedSkills,
      answers: {
        intent: this.intentSpec.objective,
        ai_refinement: JSON.stringify(this.intentSpec)
      }
    });
  }
}

module.exports = { AiInterviewer };
