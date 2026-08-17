"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { initialSkillsState, skillsReducer } = require("../skills/skills-state");
const { explorerModel, detailModel } = require("../views/skills-explorer");

const skills = [
  { id: "a", displayName: "Alpha", description: "Descrição A", normalizedCategory: "Frontend", rawCategory: "frontend", risk: "low", source: "maestro" },
  { id: "b", displayName: "Beta", description: "Descrição B", normalizedCategory: "Security", rawCategory: "security", risk: "high", source: "project" }
];

function fixtureState() {
  let state = skillsReducer(initialSkillsState(), { type: "catalog.loaded", skills });
  state = skillsReducer(state, { type: "recommendations.loaded", recommendations: [{
    skillId: "a", reasons: ["Compatível com React"], evidence: [{ kind: "detected_tech", payload: "react" }]
  }] });
  return skillsReducer(state, { type: "skill.pinned", skillId: "b", scope: "project", projectId: "P" });
}

test("T9.5: explorer omite categorias vazias e Todas inclui o catálogo completo", () => {
  const model = explorerModel(skills, fixtureState(), { columns: 140, projectId: "P" });
  assert.deepEqual(model.sections.categories.map((item) => item.id), ["Frontend", "Security"]);
  assert.deepEqual(model.sections.all.map((item) => item.id), ["a", "b"]);
});

test("T9.5: dock respeita 30% e collapsed é 24", () => {
  assert.equal(explorerModel(skills, fixtureState(), { columns: 140 }).dockWidth, 42);
  assert.equal(explorerModel(skills, fixtureState(), { columns: 180 }).dockWidth, 54);
  assert.equal(explorerModel(skills, fixtureState(), { columns: 140, collapsed: true }).dockWidth, 24);
});

test("T9.5: detail projeta razões/evidências em bullets sem porcentagem", () => {
  const model = detailModel("a", fixtureState(), { skills, projectId: "P", attachAvailable: true });
  assert.deepEqual(model.evidence, ["• Compatível com React", "• detected_tech: react"]);
  assert.ok(!model.evidence.join(" ").includes("%"));
  assert.equal(model.header.category, "Frontend");
});

test("T9.5: Attach indisponível permanece visível, desabilitado e explicado", () => {
  const model = detailModel("a", fixtureState(), { skills, projectId: "P", attachAvailable: false });
  assert.deepEqual(model.actions.find((action) => action.id === "attach"), {
    id: "attach", enabled: false, tooltip: "em breve (runtime contract)"
  });
});

test("T9.5: filtro pinned contém somente pins do projeto atual", () => {
  const model = explorerModel(skills, fixtureState(), { columns: 140, projectId: "P", status: "pinned" });
  assert.deepEqual(model.visible.map((item) => item.id), ["b"]);
});
