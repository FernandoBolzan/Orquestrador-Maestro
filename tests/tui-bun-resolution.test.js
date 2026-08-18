"use strict";

/**
 * P0 regression: the canonical Maestro TUI must be executable from the
 * packaged CLI via the real entrypoint without sekret flags or env vars.
 * The renderer runs under Bun; bun must be found even when it is not on
 * PATH (local node_modules/.bin/bun or ~/.bun/bin/bun).
 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { findBunBinary, resolveTuiRunner } = require("../runtime/tui/index.js");

const sourceEntrypoint = "opentui.ts";

test("resolveTuiRunner prefere bun do PATH quando disponivel", () => {
  const runner = resolveTuiRunner({ bunAvailable: true });
  assert.ok(runner);
  assert.equal(runner.renderer, "opentui-bun");
  assert.equal(runner.command, "bun");
  assert.ok(runner.args[0].endsWith(path.join("runtime", "tui", sourceEntrypoint)));
});

test("resolveTuiRunner encontra bun local (node_modules/.bin/bun ou ~/.bun/bin/bun) sem bun no PATH", () => {
  const runner = resolveTuiRunner({ bunAvailable: false });
  const candidates = [
    path.join(path.dirname(require.resolve("../runtime/tui/index.js")), "..", "..", "..", ".bin", "bun"),
    path.join(os.homedir(), ".bun", "bin", "bun")
  ];
  const anyBunPresent = candidates.some((candidate) => { try { return fs.existsSync(candidate); } catch { return false; } });
  if (!anyBunPresent) {
    return; // ambiente sem bun: o caso null e coberto pelo teste seguinte
  }
  assert.ok(runner, "esperava encontrar bun mesmo fora do PATH");
  assert.equal(runner.renderer, "opentui-bun");
});

test("findBunBinary com candidatos inexistentes retorna null", () => {
  assert.equal(findBunBinary([path.join(os.tmpdir(), "no-bun-here"), path.join(os.tmpdir(), "also-no")]), null);
});