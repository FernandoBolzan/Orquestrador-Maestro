"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createRegistry, COMMAND_CATEGORIES } = require("../commands/registry");

test("T10.1: registra comandos imutáveis, rejeita ids duplicados e categorias inválidas", () => {
  const registry = createRegistry({ includeDefaults: false });
  registry.register({ id: "view.help", title: "Ajuda", category: "view", execute: () => "ok" });
  assert.equal(registry.find("view.help").title, "Ajuda");
  assert.ok(Object.isFrozen(registry.find("view.help")));
  assert.throws(() => registry.register({ id: "view.help", title: "Outra", category: "view", execute() {} }), /duplicado/i);
  assert.throws(() => registry.register({ id: "bad", title: "Bad", category: "other", execute() {} }), /categoria/i);
  assert.deepEqual(COMMAND_CATEGORIES, ["project", "mission", "task", "agent", "view", "policy", "theme", "system"]);
});

test("T10.1: availability oculta comandos também do which-key", () => {
  const registry = createRegistry({ includeDefaults: false });
  registry.register({ id: "task.retry", title: "Retry", category: "task", shortcut: "r", availability: (_ctx, state) => state.retry, execute() {} });
  assert.deepEqual(registry.available({}, { retry: false }), []);
  assert.deepEqual(registry.getActiveKeys({}, { retry: false }), []);
  assert.equal(registry.getActiveKeys({}, { retry: true })[0].shortcut, "r");
});

test("T10.1: executa somente por tabela e reporta id desconhecido claramente", () => {
  const calls = [];
  const registry = createRegistry({ includeDefaults: false });
  registry.register({ id: "project.open", title: "Abrir", category: "project", execute: (ctx) => calls.push(ctx.id) });
  registry.execute("project.open", { id: "p1" });
  assert.deepEqual(calls, ["p1"]);
  assert.throws(() => registry.execute("missing", {}), /comando desconhecido.*missing/i);
});

test("T10.1: comandos padrão têm availability honesta e delegam ao client", () => {
  const calls = [];
  const client = { execute: (action, payload) => calls.push([action, payload]) };
  const ctx = { client, projectId: "p1", agentId: "a1" };
  const state = { attentionCount: 1, capabilities: { snoozeGate: true, detachRuntime: false, switchProject: true, attachAgent: true } };
  const registry = createRegistry();
  for (const id of ["view.attention", "gate.snooze", "runtime.detach", "project.switch", "agent.attach"]) assert.ok(registry.find(id), id);
  assert.deepEqual(registry.available(ctx, state).map((cmd) => cmd.id), ["view.attention", "gate.snooze", "project.switch", "agent.attach"]);
  registry.execute("agent.attach", ctx);
  assert.equal(calls[0][0], "agent.attach");
});
