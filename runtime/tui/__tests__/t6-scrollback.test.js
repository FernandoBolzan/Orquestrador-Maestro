"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { SCROLLBACK_CAP, ScrollbackRing } = require("../shell/scrollback");

test("T6.2 keeps only the newest lines within the hard cap", () => {
  const ring = new ScrollbackRing({ capacity: 20_000 });
  ring.append({ timestamp: 1, data: Array.from({ length: 20_000 }, (_, index) => `line-${index}`).join("\n") });
  assert.equal(SCROLLBACK_CAP, 10_000);
  assert.equal(ring.length, 10_000);
  assert.equal(ring.lines()[0], "line-10000");
  assert.equal(ring.lines().at(-1), "line-19999");
  assert.deepEqual(ring.search("line-9999"), null);
});

test("T6.2 search is case-insensitive and previous/next cycle through live matches", () => {
  const ring = new ScrollbackRing({ capacity: 20 });
  ring.append({ timestamp: 1, data: "Integration first\nnoise\nintegration second\nINTEGRATION third" });
  assert.deepEqual(ring.search("integration"), { indexes: [0, 2, 3], current: 0 });
  assert.deepEqual(ring.nextMatch(), { indexes: [0, 2, 3], current: 2 });
  assert.deepEqual(ring.nextMatch(), { indexes: [0, 2, 3], current: 3 });
  assert.deepEqual(ring.nextMatch(), { indexes: [0, 2, 3], current: 0 });
  assert.deepEqual(ring.previousMatch(), { indexes: [0, 2, 3], current: 3 });
});

test("T6.2 multiline chunks split into searchable lines and closed search is null", () => {
  const ring = new ScrollbackRing();
  assert.equal(ring.search(), null);
  ring.append({ timestamp: 1, data: "alpha\nbeta\ngamma\n" });
  assert.deepEqual(ring.lines(), ["alpha", "beta", "gamma"]);
  assert.deepEqual(ring.search("beta"), { indexes: [1], current: 1 });
  ring.closeSearch();
  assert.equal(ring.search(), null);
});
