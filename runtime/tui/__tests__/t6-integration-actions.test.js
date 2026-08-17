"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { resolveAction } = require("../shell/terminal-actions");

test("T6.6 wiring usa layouts, scrollback e ownership sem confundir close com terminate", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../opentui.ts"), "utf8");
  for (const symbol of ["projectTerminals", "ScrollbackRing", "enterInput", "exitInput", "resolveAction"]) assert.match(source, new RegExp(`\\b${symbol}\\b`, "u"));
  assert.doesNotMatch(source, /let terminalInput\s*=\s*(?:true|false)/u);
  assert.match(source, /Ctrl\+F fullscreen/u);
  assert.equal(resolveAction("close_view", { terminalId: "terminal-a" }).effect.type, "closeView");
  assert.equal(resolveAction("terminate_agent", { terminalId: "terminal-a", runtimeSupportsKill: false }).gated, "unavailable");
  assert.equal(resolveAction("terminate_agent", { terminalId: "terminal-a", runtimeSupportsKill: true }).gated, "confirm");
});
