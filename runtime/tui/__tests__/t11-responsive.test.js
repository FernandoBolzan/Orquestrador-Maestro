"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { tierFor, compositionFor } = require("../shell/responsive");

test("T11.2: resolve os quatro breakpoints e o fallback compacto", () => {
  assert.deepEqual(tierFor(70, 24), { tier: "compact" });
  assert.deepEqual(tierFor(100, 30), { tier: "normal" });
  assert.deepEqual(tierFor(140, 40), { tier: "wide" });
  assert.deepEqual(tierFor(180, 50), { tier: "ultrawide" });
  assert.deepEqual(tierFor(69, 20), { tier: "compact", fallback: true });
  assert.deepEqual(tierFor(140, 24), tierFor(140, 24));
});

test("T11.2: composição preserva dock e overlays por tier", () => {
  assert.deepEqual(compositionFor("compact").overlayDefaults, { skills: "overlay", inspector: "overlay" });
  const wide = compositionFor(tierFor(140, 24));
  assert.equal(wide.dockCollapsed, true);
  assert.ok(wide.candidateWindows.includes("skills"));
  assert.ok(wide.terminalRows >= 6);
});
