"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { capabilities, glyph, focusIndicator, tokenMap, renderStatus, WIREFRAME_GLYPHS } = require("../shell/accessibility");

test("T11.3: detecta NO_COLOR, terminal pobre, contraste e movimento", () => {
  assert.equal(capabilities({ NO_COLOR: "1", TERM: "xterm" }).color, false);
  const dumb = capabilities({ TERM: "dumb" });
  assert.equal(dumb.asciiGlyphs, true);
  assert.equal(dumb.reduceMotion, true);
  const rich = capabilities({ TERM: "xterm-256color", COLORTERM: "truecolor" });
  assert.equal(rich.color, true);
  assert.equal(rich.highContrast, false);
  assert.notDeepEqual(tokenMap({ ...rich, highContrast: true }), tokenMap(rich));
});

test("T11.3: fallback ASCII cobre todos os glyphs do wireframe", () => {
  const caps = { asciiGlyphs: true };
  for (const symbol of WIREFRAME_GLYPHS) assert.match(glyph(symbol, caps), /^[\x20-\x7e]+$/);
  assert.equal(glyph("★", caps), "*");
  assert.equal(glyph("⚠", caps), "!");
});

test("T11.3: foco e estado nunca dependem apenas de cor", () => {
  const caps = { asciiGlyphs: false, reduceMotion: true, color: true };
  assert.ok(focusIndicator({ focused: true, caps }).length > 0);
  assert.ok(focusIndicator({ focused: false, caps }).length > 0);
  assert.match(renderStatus("running", caps), /● running/);
  assert.match(renderStatus("running", { ...caps, asciiGlyphs: true }), /o running/);
});
