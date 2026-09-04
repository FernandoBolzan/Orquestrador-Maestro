"use strict";

const ACTION_MAP = Object.freeze({
  close_view: Object.freeze({ kind: "close_view", gated: "none", effect: Object.freeze({ type: "closeView" }) }),
  terminate_agent: Object.freeze({ kind: "terminate_agent", gated: "confirm", effect: Object.freeze({ type: "terminate" }) })
});

function resolveAction(action, context = {}) {
  const definition = ACTION_MAP[action];
  if (!definition) throw new TypeError(`unknown terminal action: ${action}`);
  if (typeof context.terminalId !== "string" || context.terminalId === "") throw new TypeError("terminalId is required");
  const effect = Object.freeze({ type: definition.effect.type, terminalId: context.terminalId });
  if (action === "close_view") return Object.freeze({ kind: action, gated: "none", effect, executable: true });
  if (context.runtimeSupportsKill !== true) {
    return Object.freeze({
      kind: action, gated: "unavailable", effect, executable: false,
      tooltip: "Terminate Agent indisponível: runtime contract ausente."
    });
  }
  return Object.freeze({ kind: action, gated: "confirm", effect, executable: context.confirmed === true });
}

module.exports = { ACTION_MAP, actionMap: ACTION_MAP, resolveAction };
