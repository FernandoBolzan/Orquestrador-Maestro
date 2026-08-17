import test from "node:test";
import assert from "node:assert/strict";
import { assertSingleFocus, focusNext, focusOrder, focusPrev, focusWindow } from "../windows/focus.ts";
import type { Window } from "../windows/contract.ts";

const windows = ["a", "b", "c"].map((id, index): Window => ({ id, type: "plan", title: id, projectId: "p", context: id, geometry: { x: index, y: 0, width: 20, height: 10 }, state: { focused: id === "a", maximized: false, minimized: false }, zOrder: index }));

test("T3.3 foco é único e eleva a janela ao topo", () => {
  const focused = focusWindow(windows, "b");
  assert.equal(assertSingleFocus(focused), true);
  assert.equal(focused.find((item) => item.id === "b")?.state.focused, true);
  assert.equal(focusOrder(focused).at(-1), "b");
});

test("T3.3 ciclo de foco é determinístico e detecta foco duplo", () => {
  assert.equal(focusNext(windows).find((item) => item.state.focused)?.id, "b");
  assert.equal(focusPrev(windows).find((item) => item.state.focused)?.id, "c");
  assert.throws(() => assertSingleFocus(windows.map((item) => ({ ...item, state: { ...item.state, focused: true } }))), /single focused window/i);
});
