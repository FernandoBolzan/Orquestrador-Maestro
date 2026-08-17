import test from "node:test";
import assert from "node:assert/strict";
import { statusGlyph } from "../views/graph-status.ts";
import { tierLayoutFor } from "../views/graph-tier-layout.ts";

test("T5.2 cobre glyphs e fallback ASCII", () => {
  for (const status of ["running", "ready", "done", "attention", "failed", "blocked", "verifying", "retrying"]) {
    assert.notEqual(statusGlyph(status, false), statusGlyph(status, true));
  }
});
test("T5.2 matriz por tier respeita floating gate", () => {
  assert.deepEqual(tierLayoutFor("COMPACT", {}, false), { mode: "list", primary: "compact", overlay: "inspector" });
  assert.equal(tierLayoutFor("NORMAL", {}, false).mode, "tiled");
  assert.equal(tierLayoutFor("WIDE", {}, false).sidebar, "dock");
  assert.equal(tierLayoutFor("ULTRAWIDE", {}, false).sidebar, "attention-dock");
  assert.equal(tierLayoutFor("ULTRAWIDE", {}, true).overlay, "attention-floating");
});
