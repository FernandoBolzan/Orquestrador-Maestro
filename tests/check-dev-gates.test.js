"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { evaluateDevGates } = require("../orquestrador/bin/check-dev-gates.js");

function writeProject(structuredStatusLines) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "orquestrador-dev-gates-"));
  fs.mkdirSync(path.join(root, "DEV", "SPECS"), { recursive: true });

  fs.writeFileSync(path.join(root, "DEV", "README.md"), "# DEV\n\nEntrada.\n", "utf8");
  fs.writeFileSync(path.join(root, "DEV", "INDEX.md"), [
    "# DEV Index",
    "",
    "- HANDOFF.md",
    "- WORKLOG.md",
    "- VERIFY.md",
    "- SPECS/ACTIVE.md"
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(root, "DEV", "HANDOFF.md"), [
    "# Handoff",
    "",
    "## Snapshot",
    "",
    "- Projeto em andamento.",
    "",
    "## Latest Work",
    "",
    "- Ajuste de documentação e gate.",
    "",
    "## Recent Entries",
    "",
    "- 2026-08-07: ajuste de documentação e gate.",
    "",
    "## Next Action",
    "",
    "- Rodar os testes antes do handoff."
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(root, "DEV", "CONTEXT.md"), [
    "# Context",
    "",
    "## State",
    "",
    "- Estado atual.",
    "",
    "## Commands",
    "",
    "- `node --test`",
    "",
    "## Constraints And Risks",
    "",
    "- Nenhum risco crítico.",
    "",
    "## Next Context",
    "",
    "- Rodar os testes antes do handoff."
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(root, "DEV", "VERIFY.md"), [
    "# Verification",
    "",
    "## Latest Verification",
    "",
    "- Smoke check local aprovado.",
    "",
    "## Outcome",
    "",
    "- Passed: testes mínimos.",
    "",
    "## Commands",
    "",
    "- `node --test`",
    "",
    "## Remaining Risk",
    "",
    "- Nenhum."
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(root, "DEV", "SPECS", "ACTIVE.md"), [
    "# Active Specification",
    "",
    "## Goal",
    "",
    "- Entregar gates úteis.",
    "",
    "## In Scope",
    "",
    "- `check-dev-gates` e `context-brief`.",
    "",
    "## Out Of Scope",
    "",
    "- Publicação.",
    "",
    "## Acceptance",
    "",
    "- Compatibilidade com DEV legado.",
    "",
    "## Verification Plan",
    "",
    "- Rodar gates e testes.",
    "",
    "## Status",
    "",
    ...structuredStatusLines
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(root, "DEV", "WORKLOG.md"), [
    "# Worklog",
    "",
    "## 2026-08-07 - Ajuste do gate",
    "",
    "- Spec: `DEV/SPECS/ACTIVE.md`",
    "- Changed: `orquestrador/bin/check-dev-gates.js`",
    "- Verified: `node --test`",
    "- Next context: revisar o resultado do gate"
  ].join("\n"), "utf8");

  return root;
}

test("evaluateDevGates aceita DEV legado em modo estrito", () => {
  const projectRoot = writeProject(["- Complete locally; awaiting review."]);
  const result = evaluateDevGates({ projectPath: projectRoot, strict: true, maxEntries: 12 });

  assert.equal(result.ok, true);
  assert.equal(result.phaseState.mode, "legacy");
  assert.equal(result.errors.length, 0);
});

test("evaluateDevGates falha com fase estruturada inválida e sugere correção", () => {
  const projectRoot = writeProject([
    "- Phase: unknown",
    "- Status: active",
    "- Next gate: rodar verificação final",
    "- Started at: 2026-08-07"
  ]);
  const result = evaluateDevGates({ projectPath: projectRoot, strict: true, maxEntries: 12 });

  assert.equal(result.ok, false);
  assert.match(result.errors[0].message, /unknown phase `unknown`/u);
  assert.ok(result.actions.some((action) => action.includes("standard phases")));
});
