"use strict";

class ClackBatchInteractionAdapter {
  constructor({ prompts } = {}) {
    this._prompts = prompts || require("@clack/prompts");
  }

  async collectBatch(questions, state) {
    const p = this._prompts;
    const batchNumber = state.batchNumber || 1;
    const totalQuestions = state.totalQuestions || questions.length;
    const answeredCount = state.answeredCount || 0;

    if (typeof p.note === "function") {
      p.note(
        `Encontramos ${totalQuestions} decisoes que precisam da sua confirmacao.\n` +
        `Progresso: ${answeredCount}/${totalQuestions}\n` +
        `Lote ${batchNumber}: ${questions.length} questoes`,
        "Refinamento da missao"
      );
    }

    const answers = {};

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const prefix = `${i + 1}/${questions.length}`;

      if (q.answerType === "text") {
        const answer = await p.text({
          message: `${prefix} ${q.text}`,
          initialValue: ""
        });
        if (p.isCancel(answer)) return { action: "cancel", answers: {} };
        answers[q.id] = answer;
        continue;
      }

      if (q.answerType === "boolean") {
        const answer = await p.confirm({
          message: `${prefix} ${q.text}`
        });
        if (p.isCancel(answer)) return { action: "cancel", answers: {} };
        answers[q.id] = answer;
        continue;
      }

      if (q.answerType === "single-choice" || q.answerType === "multi-choice") {
        const options = (q.options || []).map((o) => ({
          value: o.value,
          label: o.label + (o.recommended ? " (recomendado)" : ""),
          hint: o.description || undefined
        }));

        const answer = await p.select({
          message: `${prefix} ${q.text}`,
          options
        });
        if (p.isCancel(answer)) return { action: "cancel", answers: {} };
        answers[q.id] = answer;
        continue;
      }

      const answer = await p.text({
        message: `${prefix} ${q.text}`,
        initialValue: ""
      });
      if (p.isCancel(answer)) return { action: "cancel", answers: {} };
      answers[q.id] = answer;
    }

    if (typeof p.log?.success === "function") {
      p.log.success(`${questions.length} respostas coletadas.`);
    }

    return { action: "confirm", answers };
  }
}

module.exports = { ClackBatchInteractionAdapter };
