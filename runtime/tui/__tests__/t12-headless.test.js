"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { cockpitShortcut, terminalInputForKey } = require("../ade-model");
const { createHeadless, isBunAvailable, paletteFallback } = require("../testing/headless");

test("T12.3 modelos de tecla continuam verificáveis sem renderer", () => {
  assert.equal(cockpitShortcut({ ctrl: true, name: "k" }), "palette");
  assert.equal(terminalInputForKey({ name: "up" }), "\x1b[A");
});

test("T12.3 fallback da palette executa comando exclusivamente pelo registry injetado", async () => {
  const calls = [];
  const registry = { available: () => [{ id: "verify", title: "Run verification", category: "system" }], execute: (id) => calls.push(id) };
  const model = paletteFallback({ query: "run ver", registry, ctx: {}, state: {} });
  assert.equal(model.results[0].kind, "command");
  await model.select(0); assert.deepEqual(calls, ["verify"]);
});

test("T12.3 renderer Bun executa captura 70x24 com quiescência", { skip: !process.env.ORQUESTRADOR_TUI_BUN_E2E ? "ORQUESTRADOR_TUI_BUN_E2E=1 não habilitado; OpenTUI FFI requer Bun" : false }, async () => {
  assert.equal(isBunAvailable(), true, "gate solicitado fora do runtime Bun");
  const renderer = await createHeadless({ width: 70, height: 24 });
  try {
    assert.equal(typeof renderer.capture(), "string");
  } finally {
    renderer.close();
  }
});

test("T12.3 gate não confunde Node com Bun", () => {
  assert.equal(isBunAvailable(), typeof globalThis.Bun !== "undefined");
});
