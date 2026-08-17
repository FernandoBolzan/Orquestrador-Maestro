import test from "node:test";
import assert from "node:assert/strict";
import { FLOATING_PROVEN } from "../windows/spike-flags.ts";
import { floatingEnabled } from "../windows/placement.ts";

test("T3.8 suporte técnico não eleva autorização de produção", () => {
  assert.equal(FLOATING_PROVEN, false);
  assert.equal(floatingEnabled("WIDE"), false);
  assert.equal(floatingEnabled("ULTRAWIDE"), false);
});
