import test from "node:test";
import assert from "node:assert/strict";
import { closeView, detachTerminal, fullscreenToggle, hideWindow, terminateAgent } from "../windows/lifecycle.ts";
import type { Window } from "../windows/contract.ts";

const terminal: Window = { id: "term", type: "agent-terminal", title: "Agent", projectId: "p", context: "agent", geometry: { x: 1, y: 1, width: 40, height: 12 }, state: { focused: true, maximized: false, minimized: false }, zOrder: 0 };

test("T3.6 fechar view nunca encerra processo ou run", () => {
  const result = closeView([terminal], terminal.id);
  assert.deepEqual(result.windows, []);
  assert.deepEqual(result.commands, []);
  assert.equal(result.commands.some((command) => /kill|cancel|terminate/.test(command.type)), false);
});

test("T3.6 terminate é confirmação explícita; detach e hide são view-state", () => {
  assert.equal(terminateAgent(terminal.id, { step: 1, confirm: false }).pending, true);
  assert.deepEqual(terminateAgent(terminal.id, { step: 1, confirm: true }).commands, [{ type: "agent.terminate", windowId: "term" }]);
  assert.deepEqual(detachTerminal([terminal], terminal.id).commands, [{ type: "terminal.detach", windowId: "term" }]);
  assert.equal(hideWindow([terminal], terminal.id).windows[0]?.state.minimized, true);
  assert.equal(fullscreenToggle([terminal], terminal.id, { width: 100, height: 30 }).windows[0]?.state.maximized, true);
});
