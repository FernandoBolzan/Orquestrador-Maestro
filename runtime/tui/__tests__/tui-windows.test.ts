import test from "node:test";
import assert from "node:assert/strict";
import { isGeometry, isWindow, WINDOW_TYPES } from "../windows/contract.ts";

test("T3.1 valida o contrato de janela sem renderer", () => {
  const window = { id: "w", type: "plan", title: "PLAN · missão", projectId: "p", context: "missão", geometry: { x: 0, y: 0, width: 40, height: 12 }, state: { focused: true, maximized: false, minimized: false }, zOrder: 1 } as const;
  assert.equal(isWindow(window), true);
  assert.equal(isWindow({ ...window, context: "" }), false);
  assert.equal(isWindow({ ...window, type: "unknown" }), false);
  assert.deepEqual(WINDOW_TYPES, ["cockpit", "plan", "inspector", "agent-terminal", "attention", "skills", "overlay"]);
});

test("T3.1 rejeita geometria negativa, fracionária ou sem área", () => {
  assert.equal(isGeometry({ x: 0, y: 0, width: 1, height: 1 }), true);
  for (const geometry of [{ x: -1, y: 0, width: 1, height: 1 }, { x: 0, y: 0, width: 0, height: 1 }, { x: 0.5, y: 0, width: 1, height: 1 }]) assert.equal(isGeometry(geometry), false);
});
