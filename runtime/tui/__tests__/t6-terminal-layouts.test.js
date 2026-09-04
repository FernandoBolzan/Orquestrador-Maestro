"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { projectTerminals } = require("../views/terminal-layouts");

function assertDisjointAndInside(rects, columns, rows) {
  for (const rect of rects) {
    assert.ok(rect.x >= 0 && rect.y >= 0 && rect.w > 0 && rect.h > 0);
    assert.ok(rect.x + rect.w <= columns && rect.y + rect.h <= rows);
  }
  for (let left = 0; left < rects.length; left += 1) for (let right = left + 1; right < rects.length; right += 1) {
    const a = rects[left]; const b = rects[right];
    const overlap = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))
      * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    assert.equal(overlap, 0);
  }
  assert.equal(rects.reduce((area, rect) => area + rect.w * rect.h, 0), columns * rows);
}

test("T6.3 h-split supports seven terminals without a legacy six-panel cap", () => {
  const layout = projectTerminals({ count: 7, columns: 140, rows: 28, mode: "h-split", focusIndex: 4 });
  assert.equal(layout.rects.length, 7);
  assert.equal(layout.focus, 4);
  assertDisjointAndInside(layout.rects, 140, 28);
});

test("T6.3 single and 2x2 tile their complete area", () => {
  assert.deepEqual(projectTerminals({ count: 5, columns: 80, rows: 24, mode: "single", focusIndex: 3 }).rects,
    [{ x: 0, y: 0, w: 80, h: 24, index: 3 }]);
  const grid = projectTerminals({ count: 4, columns: 81, rows: 25, mode: "2x2", focusIndex: 2 });
  assert.equal(grid.rects.length, 4);
  assertDisjointAndInside(grid.rects, 81, 25);
});

test("T6.3 fullscreen is a projection and leaves the layout tree intact", () => {
  const normal = projectTerminals({ count: 4, columns: 100, rows: 30, mode: "2x2", focusIndex: 2 });
  const fullscreen = projectTerminals({ count: 4, columns: 100, rows: 30, mode: "2x2", fullscreen: true, focusIndex: 2 });
  const restored = projectTerminals({ count: 4, columns: 100, rows: 30, mode: "2x2", fullscreen: false, focusIndex: 2 });
  assert.deepEqual(fullscreen.rects, [{ x: 0, y: 0, w: 100, h: 30, index: 2 }]);
  assert.deepEqual(fullscreen.layoutTree, normal.layoutTree);
  assert.deepEqual(restored.rects, normal.rects);
});

test("T6.3 focus layout gives the selected terminal the primary area", () => {
  const layout = projectTerminals({ count: 4, columns: 90, rows: 30, mode: "focus", focusIndex: 2 });
  const focused = layout.rects.find((rect) => rect.index === 2);
  assert.ok(focused.w > layout.rects.find((rect) => rect.index !== 2).w);
  assertDisjointAndInside(layout.rects, 90, 30);
});

test("T6.3 2x2 paging is deterministic around focus", () => {
  const layout = projectTerminals({ count: 9, columns: 80, rows: 24, mode: "2x2", focusIndex: 6 });
  assert.deepEqual(layout.rects.map((rect) => rect.index), [4, 5, 6, 7]);
});
