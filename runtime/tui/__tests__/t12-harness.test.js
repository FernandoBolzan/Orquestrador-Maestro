"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { FIXTURES, fixture, golden, runToQuiescence, validateProjectSnapshot } = require("../testing/harness");

test("T12.1 fixtures publicadas existem e parseiam", () => {
  for (const name of Object.keys(FIXTURES)) assert.ok(fixture(name));
});

test("T12.1 quiescência espera busy assíncrono voltar a idle", async () => {
  const state = { ui: { busy: {} } };
  const result = await runToQuiescence(state, async () => {
    state.ui.busy.refresh = true;
    queueMicrotask(() => { state.ui.busy.refresh = false; });
    return "ok";
  }, { timeoutMs: 100, pollMs: 0 });
  assert.equal(result, "ok");
});

test("T12.1 quiescência travada falha com timeout explícito", async () => {
  const state = { ui: { busy: { socket: true } } };
  await assert.rejects(runToQuiescence(state, () => {}, { timeoutMs: 10, pollMs: 1 }), /quiescence timeout/i);
});

test("T12.1 golden é estável apesar da ordem de chaves", () => {
  assert.equal(golden({ z: 1, nested: { b: 2, a: 1 } }), '{"nested":{"a":1,"b":2},"z":1}');
});

test("T12.1 snapshot F7 exige projeto, epoch, seq e coleções", () => {
  assert.equal(validateProjectSnapshot(fixture("projectSnapshot")), true);
  assert.throws(() => validateProjectSnapshot({ projectId: "p1" }), /epoch/);
});

test("T12.1 fixture de skills contém somente ids do manifesto real", () => {
  const skills = fixture("skills");
  const manifest = require("../../../orquestrador/SKILLS_MANIFEST.json");
  const packageIds = new Set(Object.keys(manifest.skills));
  assert.ok(skills.length > 0 && skills.length < 42);
  assert.ok(skills.every((skill) => packageIds.has(skill.id)));
});
