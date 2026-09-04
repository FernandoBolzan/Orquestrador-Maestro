"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { fixture } = require("../testing/harness");
const { runPtyE2E } = require("../testing/pty-e2e");

test("T12.4 gate PTY executa stream, busca, resize e preservação de sessão", { skip: process.env.ORQUESTRADOR_TUI_PTY_E2E !== "1" ? "ORQUESTRADOR_TUI_PTY_E2E=1 não habilitado; node-pty requer toolchain nativa" : false }, async () => {
  const result = await runPtyE2E({ stream: fixture("ptyStream"), steps: [{ type: "resize", columns: 120, rows: 40 }, { type: "detach" }, { type: "attach" }, { type: "closeView" }] });
  assert.match(result.frame, /build complete/);
  assert.deepEqual(result.search("complete"), [2]);
  assert.equal(result.dimensions.columns, 120);
  assert.equal(result.buffer.includes("build complete"), true);
  assert.equal(result.attached, true);
  assert.equal(result.viewOpen, false);
});

test("T12.4 runner recusa falso-verde fora do gate", async () => {
  if (process.env.ORQUESTRADOR_TUI_PTY_E2E === "1") return;
  await assert.rejects(runPtyE2E({ stream: [] }), /ORQUESTRADOR_TUI_PTY_E2E=1/);
});
