"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { BASE_THEME, SEMANTIC_TOKENS } = require("../theme/semantic-tokens");
const { chromeTitle, chromeBorderColor } = require("../views/window-chrome");

const LEGACY = { canvas: "#05070b", surface: "#0a0f16", raised: "#101722", border: "#243244", borderMuted: "#162131", text: "#e6edf5", muted: "#8391a5", faint: "#526074", cyan: "#31d7ff", green: "#31e6a1", lime: "#b6f36b", orange: "#ffb454", violet: "#b99aff", red: "#ff6b7a", selection: "#14293a" };
const NAMES = ["background", "surface", "raised", "border", "borderFocused", "text", "textMuted", "accent", "running", "ready", "success", "warning", "danger", "critical", "blocked", "attention", "selection"];

test("T11.1: tokens semânticos resolvem às cores reais e espelham o bloco TS", () => {
  assert.deepEqual(BASE_THEME, LEGACY);
  assert.deepEqual(Object.keys(SEMANTIC_TOKENS), NAMES);
  for (const value of Object.values(SEMANTIC_TOKENS)) assert.ok(Object.values(BASE_THEME).includes(value), value);
  const source = fs.readFileSync(path.join(__dirname, "..", "ade-theme.ts"), "utf8");
  for (const [name, value] of Object.entries(SEMANTIC_TOKENS)) assert.match(source, new RegExp(`${name}:\\s*[\"']${value}[\"']`));
});

test("T11.1: chrome usa título de uma linha e accent somente no foco", () => {
  assert.equal(chromeTitle("TASK", "Implementar", {}), "TASK · Implementar");
  assert.equal(chromeTitle("TASK", "Implementar", { attention: true }), "⚠ TASK · Implementar");
  assert.ok(!chromeTitle("TASK", "linha\nnova", {}).includes("\n"));
  assert.equal(chromeBorderColor({ focused: true, attention: false }), SEMANTIC_TOKENS.accent);
  assert.equal(chromeBorderColor({ focused: false, attention: true }), SEMANTIC_TOKENS.border);
});
