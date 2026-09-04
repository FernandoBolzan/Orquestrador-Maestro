import test from "node:test";
import assert from "node:assert/strict";
import { autoPlace, floatingEnabled, keyboardFallback, tiledSplit } from "../windows/placement.ts";
import type { Window } from "../windows/contract.ts";

const base: Window = { id: "plan", type: "plan", title: "Plan", projectId: "p", context: "p", geometry: { x: 0, y: 0, width: 60, height: 30 }, state: { focused: true, maximized: false, minimized: false }, zOrder: 0 };

test("T3.4 AUTO respeita políticas por tier", () => {
  const compact = autoPlace([base], { kind: "agent", window: { ...base, id: "agent", type: "agent-terminal" } }, { width: 69, height: 30 });
  assert.deepEqual(compact.map((item) => item.id), ["agent"]);
  const normal = autoPlace([base], { kind: "attention-critical", window: { ...base, id: "attention", type: "attention" } }, { width: 110, height: 30 });
  assert.equal(normal.find((item) => item.id === "attention")?.geometry.x, 55);
  const wide = autoPlace([base], { kind: "attention-critical", window: { ...base, id: "attention", type: "attention" } }, { width: 150, height: 40 });
  assert.equal(wide.find((item) => item.id === "attention")?.geometry.x, 45);
  const inspect = autoPlace([base], { kind: "inspect", window: { ...base, id: "inspector", type: "inspector" } }, { width: 110, height: 30 });
  assert.ok((inspect.find((item) => item.id === "inspector")?.geometry.x ?? 0) > 0);
});

test("T3.4 tiled split conserva viewport e floating segue gated", () => {
  const split = tiledSplit([base, { ...base, id: "agent", zOrder: 1 }], "vertical", { width: 101, height: 30 });
  assert.ok(split.reduce((sum, item) => sum + item.geometry.width, 0) <= 101);
  assert.equal(floatingEnabled("COMPACT"), false);
  assert.equal(floatingEnabled("WIDE"), false);
  assert.match(keyboardFallback("WIDE").join(" · "), /Ctrl\+M.*Ctrl\+R.*Ctrl\+F.*Alt\+M.*Ctrl\+W/);
});
