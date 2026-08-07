"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { buildBrief } = require("../orquestrador/bin/context-brief.js");
const { makeTempDir, writeFile } = require("./test-helpers.js");

function makeProject() {
  const root = makeTempDir("orquestrador-workflow-");
  writeFile(root, "AGENTS.md", "# Contrato\n\nPreservar fases e workflows.\n");
  writeFile(root, "DEV/README.md", "# DEV\n");
  writeFile(root, "DEV/INDEX.md", "# Index\n\n- WORKFLOWS/phase-rollout-workflow.md\n");
  writeFile(root, "DEV/HANDOFF.md", "# Handoff\n\nPróxima ação: validar rollout.\n");
  writeFile(root, "DEV/CONTEXT.md", "# Contexto\n\nEstado atual.\n");
  writeFile(root, "DEV/SPECS/ACTIVE.md", "# Spec\n\nValidar parsing de workflow.\n");
  writeFile(root, "DEV/VERIFY.md", "# Verify\n\nÚltima execução.\n");
  writeFile(root, "DEV/WORKFLOWS/phase-rollout-workflow.md", "# Workflow\n\nExecutar a fase de rollout com gates humanos.\n");
  writeFile(root, "DEV/WORKFLOWS/unrelated-notes.md", "# Notes\n\nDocumento sem relação com a intenção.\n");
  return root;
}

test("buildBrief includes workflow phase documents that match the task intent", () => {
  const projectRoot = makeProject();

  const result = buildBrief({
    projectPath: projectRoot,
    task: "phase rollout workflow",
    maxChars: 8000
  });

  assert.match(result.content, /DEV\/WORKFLOWS\/phase-rollout-workflow\.md/u);
});
