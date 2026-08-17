"use strict";

const COMMAND_CATEGORIES = Object.freeze(["project", "mission", "task", "agent", "view", "policy", "theme", "system"]);
const CATEGORY_SET = new Set(COMMAND_CATEGORIES);

const DEFAULT_COMMANDS = [
  ["view.attention", "Abrir atenção", "view", "a", (_ctx, state) => Number(state?.attentionCount) > 0],
  ["gate.snooze", "Adiar gate", "policy", undefined, (_ctx, state) => state?.capabilities?.snoozeGate === true],
  ["runtime.detach", "Desanexar runtime", "system", undefined, (_ctx, state) => state?.capabilities?.detachRuntime === true],
  ["project.switch", "Trocar projeto", "project", "p", (_ctx, state) => state?.capabilities?.switchProject === true],
  ["agent.attach", "Anexar agente", "agent", undefined, (_ctx, state) => state?.capabilities?.attachAgent === true]
];

function createRegistry({ includeDefaults = true } = {}) {
  const commands = new Map();

  function register(command) {
    if (!command || typeof command.id !== "string" || !command.id.trim()) throw new TypeError("Comando exige id");
    if (commands.has(command.id)) throw new Error(`Id de comando duplicado: ${command.id}`);
    if (!CATEGORY_SET.has(command.category)) throw new Error(`Categoria de comando inválida: ${command.category}`);
    if (typeof command.title !== "string" || typeof command.execute !== "function") throw new TypeError("Comando exige title e execute");
    const stored = Object.freeze({ ...command, availability: command.availability || (() => true) });
    commands.set(stored.id, stored);
    return stored;
  }

  const find = (id) => commands.get(id);
  const all = () => Array.from(commands.values());
  const available = (ctx, state) => all().filter((command) => command.availability(ctx, state) === true);
  const getActiveKeys = (ctx, state) => available(ctx, state)
    .filter((command) => command.shortcut)
    .map(({ id, title, category, shortcut }) => ({ id, title, category, shortcut }));
  const execute = (id, ctx) => {
    const command = find(id);
    if (!command) throw new Error(`Comando desconhecido: ${id}`);
    return command.execute(ctx);
  };

  if (includeDefaults) {
    for (const [id, title, category, shortcut, availability] of DEFAULT_COMMANDS) {
      register({ id, title, category, shortcut, availability, execute: (ctx) => ctx?.client?.execute(id, ctx) });
    }
  }
  return Object.freeze({ register, find, all, available, getActiveKeys, execute });
}

module.exports = { COMMAND_CATEGORIES, createRegistry };
