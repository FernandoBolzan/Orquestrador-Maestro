"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { buildBrief, parseArgs } = require("../orquestrador/bin/context-brief.js");

function makeProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "orquestrador-context-"));
  fs.mkdirSync(path.join(root, "DEV", "TASKS"), { recursive: true });
  fs.writeFileSync(path.join(root, "AGENTS.md"), "# Contrato\n\nNão quebrar compatibilidade.\napi_key=secret-value\n", "utf8");
  fs.writeFileSync(path.join(root, "DEV", "HANDOFF.md"), "# Handoff\n\nPróxima ação: validar.\n", "utf8");
  fs.writeFileSync(path.join(root, "DEV", "CONTEXT.md"), "# Contexto\n\nEstado atual.\n", "utf8");
  fs.writeFileSync(path.join(root, "DEV", "TASKS", "release-npm.md"), "# Publicação npm\n\nValidar pacote e atualização.\n", "utf8");
  fs.writeFileSync(path.join(root, "DEV", "WORKLOG.md"), "# Histórico\n\nNão incluir.\n", "utf8");
  return root;
}

test("parseArgs aceita o briefing conversacional sem comando obrigatório", () => {
  const options = parseArgs(["--task", "memória entre agentes", "--max-chars", "4000", "--json"]);
  assert.equal(options.task, "memória entre agentes");
  assert.equal(options.maxChars, 4000);
  assert.equal(options.json, true);
});

test("buildBrief prioriza contrato e memória compacta", () => {
  const projectRoot = makeProject();
  const result = buildBrief({ projectPath: projectRoot, task: "publicação npm", maxChars: 5000 });
  assert.match(result.content, /AGENTS\.md/u);
  assert.match(result.content, /DEV\/HANDOFF\.md/u);
  assert.match(result.content, /release-npm\.md/u);
  assert.doesNotMatch(result.content, /Não incluir/u);
  assert.doesNotMatch(result.content, /secret-value/u);
  assert.doesNotMatch(result.content, /Projeto: [A-Z]:/u);
  assert.ok(result.used <= 5000);
});

test("buildBrief respeita o orçamento e omite histórico sensível", () => {
  const projectRoot = makeProject();
  const result = buildBrief({ projectPath: projectRoot, task: "", maxChars: 1000 });
  assert.ok(result.used <= 1000);
  assert.doesNotMatch(result.content, /WORKLOG\.md/u);
});
