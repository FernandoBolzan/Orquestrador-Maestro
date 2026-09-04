import test from "node:test";
import assert from "node:assert/strict";
import { clamp, hitRegion, maximize, minSizesFor, move, resize, restore, tierFor } from "../windows/geometry.ts";

test("T3.2 move, resize e clamp mantêm células dentro do viewport", () => {
  const viewport = { width: 120, height: 40 };
  const minimum = { minW: 20, minH: 6 };
  assert.deepEqual(move({ x: 5, y: 4, width: 30, height: 10 }, -99, 99, viewport), { x: 0, y: 30, width: 30, height: 10 });
  assert.deepEqual(resize({ x: 90, y: 30, width: 30, height: 10 }, 99, -99, viewport, minimum), { x: 90, y: 30, width: 30, height: 6 });
  const fixed = clamp({ x: -5, y: -2, width: 3, height: 2 }, viewport, minimum);
  assert.ok(fixed.width >= minimum.minW && fixed.height >= minimum.minH);
});

test("T3.2 maximize, restore, tiers e hit regions são determinísticos", () => {
  const saved = { x: 3, y: 2, width: 40, height: 12 };
  assert.deepEqual(maximize(saved, { width: 100, height: 30 }), { x: 0, y: 0, width: 100, height: 30 });
  assert.deepEqual(restore({ x: 0, y: 0, width: 100, height: 30 }, saved), saved);
  assert.deepEqual([tierFor(69), tierFor(100), tierFor(140), tierFor(180)], ["COMPACT", "NORMAL", "WIDE", "ULTRAWIDE"]);
  assert.ok(minSizesFor("WIDE").minW > 0);
  assert.equal(hitRegion(saved, 3, 8), "resize-left");
  assert.equal(hitRegion(saved, 42, 8), "resize-right");
  assert.equal(hitRegion(saved, 20, 2), "title");
  assert.equal(hitRegion(saved, 20, 8), "content");
});
