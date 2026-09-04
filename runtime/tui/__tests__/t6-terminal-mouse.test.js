"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  NORMAL_MODE, TERMINAL_INPUT_MODE, enterInput, exitInput, hitRegion, transition
} = require("../views/terminal-mouse");

const rect = { x: 10, y: 5, w: 70, h: 24 };

test("T6.4 hit testing permits drag only from title or edge chrome", () => {
  assert.equal(hitRegion(20, 5, rect), "title");
  assert.equal(hitRegion(10, 15, rect), "edge");
  assert.equal(hitRegion(20, 15, rect), "content");
  const content = transition({ type: "down", x: 20, y: 15, button: 0 }, { mode: NORMAL_MODE, rect });
  assert.equal(content.suppressInput, false);
  assert.equal(content.dragStart, null);
  const title = transition({ type: "down", x: 20, y: 5, button: 0 }, { mode: NORMAL_MODE, rect });
  assert.deepEqual(title.dragStart, { axis: "move", x: 20, y: 5 });
  assert.equal(title.suppressInput, true);
});

test("T6.4 consecutive drag events suppress PTY input through dragEnd", () => {
  let state = transition({ type: "down", x: 10, y: 15, button: 0 }, { mode: NORMAL_MODE, rect });
  assert.equal(state.dragStart.axis, "resize");
  state = transition({ type: "drag", x: 8, y: 15, button: 0 }, state);
  assert.equal(state.suppressInput, true);
  state = transition({ type: "drag", x: 7, y: 16, button: 0 }, state);
  assert.equal(state.suppressInput, true);
  state = transition({ type: "dragEnd", x: 7, y: 16, button: 0 }, state);
  assert.equal(state.suppressInput, true);
  assert.equal(state.dragStart, null);
  const settled = transition({ type: "over", x: 20, y: 15 }, state);
  assert.equal(settled.suppressInput, false);
});

test("T6.4 terminal input ownership changes only through explicit toggles", () => {
  const clicked = transition({ type: "down", x: 20, y: 15, button: 0 }, { mode: NORMAL_MODE, rect });
  assert.equal(clicked.mode, NORMAL_MODE);
  const input = enterInput(clicked);
  assert.equal(input.mode, TERMINAL_INPUT_MODE);
  assert.equal(transition({ type: "down", x: 20, y: 15, button: 0 }, input).toPty, true);
  assert.equal(transition({ type: "up", x: 20, y: 15, button: 0 }, input).toPty, true);
  const wheel = transition({ type: "scroll", x: 20, y: 15, button: 0 }, input);
  assert.equal(wheel.toPty, false);
  assert.equal(exitInput(input).mode, NORMAL_MODE);
});

test("T6.4 every transition returns exactly one valid ownership mode", () => {
  for (const mode of [NORMAL_MODE, TERMINAL_INPUT_MODE]) for (const type of ["down", "drag", "dragEnd", "up", "scroll", "over"]) {
    assert.ok([NORMAL_MODE, TERMINAL_INPUT_MODE].includes(transition({ type, x: 20, y: 15, button: 0 }, { mode, rect }).mode));
  }
});
