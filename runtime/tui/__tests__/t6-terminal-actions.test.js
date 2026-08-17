"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { ACTION_MAP, resolveAction } = require("../shell/terminal-actions");

test("T6.5 close view is an ungated presentation effect and never terminates", () => {
  assert.deepEqual(Object.keys(ACTION_MAP), ["close_view", "terminate_agent"]);
  assert.equal(ACTION_MAP.close_view.effect.type, "closeView");
  assert.equal(ACTION_MAP.close_view.gated, "none");
  const resolved = resolveAction("close_view", { terminalId: "term-1", status: "running", runtimeSupportsKill: true });
  assert.equal(resolved.gated, "none");
  assert.deepEqual(resolved.effect, { type: "closeView", terminalId: "term-1" });
  assert.equal(resolved.executable, true);
});

test("T6.5 terminate stays unavailable without the runtime kill contract", () => {
  const resolved = resolveAction("terminate_agent", { terminalId: "term-1", status: "running", runtimeSupportsKill: false, confirmed: true });
  assert.equal(resolved.gated, "unavailable");
  assert.equal(resolved.executable, false);
  assert.match(resolved.tooltip, /runtime contract/u);
});

test("T6.5 runtime support still requires explicit level-one confirmation", () => {
  const pending = resolveAction("terminate_agent", { terminalId: "term-1", status: "running", runtimeSupportsKill: true, confirmed: false });
  assert.equal(pending.gated, "confirm");
  assert.equal(pending.executable, false);
  assert.deepEqual(pending.effect, { type: "terminate", terminalId: "term-1" });
  const confirmed = resolveAction("terminate_agent", { terminalId: "term-1", status: "running", runtimeSupportsKill: true, confirmed: true });
  assert.equal(confirmed.gated, "confirm");
  assert.equal(confirmed.executable, true);
});

test("T6.5 every catalog action preserves close versus terminate invariants", () => {
  for (const action of Object.keys(ACTION_MAP)) for (const runtimeSupportsKill of [false, true]) {
    const resolved = resolveAction(action, { terminalId: "term-1", status: "running", runtimeSupportsKill, confirmed: true });
    if (action === "close_view") assert.equal(resolved.effect.type, "closeView");
    if (action === "terminate_agent") {
      assert.equal(resolved.effect.type, "terminate");
      assert.ok(["confirm", "unavailable"].includes(resolved.gated));
    }
  }
});
