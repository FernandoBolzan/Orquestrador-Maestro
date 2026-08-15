"use strict";

const defaultPrompts = require("@clack/prompts");
const { DynamicInterviewer } = require("./dynamic-interviewer");
const { createIntentSpec } = require("./intent-spec");
const { IntentRefiner } = require("./intent-refiner");
const { evaluateReadiness } = require("./readiness-evaluator");

function blockerSignature(blocker) {
  return `${blocker.type}|${blocker.dimension}|${blocker.description}`;
}

function canonicalReadinessState(intentSpec) {
  return JSON.stringify({
    requirements: (intentSpec.requirements || []).length,
    constraints: (intentSpec.constraints || []).length,
    openUnknowns: (intentSpec.unknowns || [])
      .filter(u => u.blocking && u.status === "OPEN")
      .map(u => `${u.id}:${u.dimension}`)
  });
}

function resolveUnknown(unknown, blocker, answer) {
  if (unknown && unknown.dimension === blocker.dimension && unknown.status === "OPEN") {
    const resolved = {
      ...unknown,
      status: "RESOLVED",
      metadata: { ...(unknown.metadata || {}), resolvedBy: "USER_DECISION", answeredAt: new Date().toISOString(), answer }
    };
    try {
      return createIntentUnknown({
        id: unknown.id,
        dimension: unknown.dimension,
        description: unknown.description,
        reason: unknown.reason,
        blocking: unknown.blocking === true,
        status: "RESOLVED",
        metadata: resolved.metadata
      });
    } catch (e) {
      return resolved;
    }
  }
  return unknown;
}

class AiInterviewer {
  constructor({ resolvedSkills, preflightFacts, application, intent, aiProvider = "opencode", prompts = defaultPrompts }) {
    this.p = prompts;
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
      this.p.note(`Provedor de IA (${this.aiProvider}) não detectado. Usando modo de refinamento por heurística.`, "Fallback");
      const fallback = new DynamicInterviewer({ resolvedSkills: this.resolvedSkills, preflightFacts: this.facts });
      return fallback.runInteractive();
    }

    this.p.note(`Assistente Inteligente ativado (${this.aiProvider}). Analisando projeto e skills...`, "AI Planner");

    let isReady = false;
    const s = this.p.spinner();
    let lastQuestion = null;
    let lastCanonicalState = null;

    while (!isReady) {
       try {
         s.start("IA analisando intenção...");
         this.intentSpec = await this.refiner.refine(this.intentSpec, lastQuestion && lastQuestion.answer ? {
           blocker: lastQuestion.blocker,
           answer: lastQuestion.answer
         } : null);
       } catch (e) {
         this.p.log.error(`Falha no refinamento via IA: ${e.message}`);
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
       const currentState = canonicalReadinessState(this.intentSpec);

       // Narrow loop safety: the identical question must not repeat from
       // unchanged readiness-relevant state after a human answer was applied.
       if (lastQuestion &&
           blockerSignature(blocker) === lastQuestion.signature &&
           currentState === lastCanonicalState) {
         throw new Error(
           `M2_CLARIFICATION_LOOP: a pergunta "${blocker.description}" (${blocker.dimension}) repetiu sem evolução de estado (requirements=${this.intentSpec.requirements.length}, constraints=${this.intentSpec.constraints.length}).`
         );
       }

       const answer = await this.p.text({
          message: `[AI] Esclareça a seguinte pendência (${blocker.dimension}): ${blocker.description}`,
          placeholder: "Sua resposta (ou 'skip' para prosseguir)"
       });

       if (this.p.isCancel(answer) || answer === "skip" || answer === "q" || answer.trim() === "") {
         break; // user skipped, we might still be not ready but we stop
       }

       // A human answer is an authoritative USER_DECISION. It is recorded
       // verbatim and the answered dimension transitions to RESOLVED. The
       // next refinement round receives the clarification so the AI can
       // propose structured requirements/constraints derived from it.
       this.intentSpec = createIntentSpec(this.intentSpec.intent, {
         ...this.intentSpec,
         updatedAt: new Date().toISOString(),
         userDecisions: [...this.intentSpec.userDecisions, `Decided [${blocker.dimension}]: ${answer}`],
         unknowns: this.intentSpec.unknowns.map(u => resolveUnknown(u, blocker, answer))
       });

       lastQuestion = { signature: blockerSignature(blocker), blocker, answer };
       lastCanonicalState = canonicalReadinessState(this.intentSpec);
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
        ai_refinement: JSON.stringify(this.intentSpec),
        requirements: [...this.intentSpec.requirements],
        constraints: [...this.intentSpec.constraints],
        userDecisions: [...this.intentSpec.userDecisions],
        unknowns: [...this.intentSpec.unknowns]
      }
    });
  }
}

module.exports = { AiInterviewer };
