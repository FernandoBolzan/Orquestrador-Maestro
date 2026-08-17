"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createRegistry } = require("../commands/registry");
const { paletteModel, selectResult } = require("../commands/palette");

function fixture() {
  const calls = [];
  const registry = createRegistry({ includeDefaults: false });
  registry.register({ id: "system.verify", title: "Run verification", category: "system", shortcut: "v", keywords: ["test driven"], execute: (ctx) => calls.push(ctx) });
  registry.register({ id: "task.retry", title: "Retry task", category: "task", availability: () => false, execute() {} });
  const domains = {
    commands: registry,
    projects: [{ id: "p1", title: "Escola Online" }],
    missions: [{ id: "m1", title: "Test mission" }],
    tasks: [], agents: [],
    skills: [{ id: "test-driven-development", title: "test-driven-development", displayName: "Test Driven Development", description: "test driven workflow", source: "maestro" }]
  };
  return { registry, domains, calls };
}

test("T10.2: ranking universal mistura comandos e skills deterministicamente", () => {
  const { domains } = fixture();
  const first = paletteModel({ query: "test driv", domains, ctx: {}, state: {} });
  const second = paletteModel({ query: "test driv", domains, ctx: {}, state: {} });
  assert.deepEqual(first, second);
  assert.equal(first.results[0].kind, "command");
  assert.equal(first.results[1].kind, "skill");
  assert.ok(first.results.some((result) => result.kind === "command" && result.id === "system.verify"));
  assert.ok(first.results.every((result) => result.kind && result.id && result.title && result.category && Number.isFinite(result.score)));
});

test("T10.2: prefixo >p restringe a projetos", () => {
  const { domains } = fixture();
  const model = paletteModel({ query: ">p escol", domains, ctx: {}, state: {} });
  assert.deepEqual(model.results.map((result) => result.kind), ["project"]);
  assert.equal(model.results[0].id, "p1");
});

test("T10.2: comandos indisponíveis não aparecem", () => {
  const { domains } = fixture();
  const model = paletteModel({ query: "retry task", domains, ctx: {}, state: {} });
  assert.ok(!model.results.some((result) => result.id === "task.retry"));
});

test("T10.2: seleção executa comando via registry ou emite ação tipada", () => {
  const { registry, domains, calls } = fixture();
  const command = paletteModel({ query: "run verification", domains, ctx: {}, state: {} }).results.find((r) => r.kind === "command");
  selectResult(command, { registry, ctx: { marker: 1 } });
  assert.deepEqual(calls, [{ marker: 1 }]);
  assert.deepEqual(selectResult({ kind: "project", id: "p1", title: "P", category: "project", score: 1 }, { registry, ctx: {} }), { type: "palette.select", kind: "project", id: "p1" });
  assert.equal(selectResult(null, { registry, ctx: {} }), null);
});

test("T10.2: queries curtas mostram apenas prefixos óbvios", () => {
  const { domains } = fixture();
  assert.deepEqual(paletteModel({ query: "ru", domains, ctx: {}, state: {} }).results.map((r) => r.id), ["system.verify"]);
  assert.equal(paletteModel({ query: "et", domains, ctx: {}, state: {} }).results.length, 0);
});
