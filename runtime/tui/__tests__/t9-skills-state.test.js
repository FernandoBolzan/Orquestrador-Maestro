"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const os = require("node:os");
const {
  initialSkillsState, skillsReducer, selectSkillState, selectCounts
} = require("../skills/skills-state");
const {
  DEFAULT_PREFERENCES, parsePreferences, validatePreferences, toSemanticTaskInput
} = require("../skills/execution-preference");

test("T9.4: estados são ortogonais e contagens não confundem recommended com pinned", () => {
  let state = initialSkillsState();
  state = skillsReducer(state, { type: "catalog.loaded", skills: [{ id: "a" }, { id: "b" }] });
  state = skillsReducer(state, { type: "recommendations.loaded", recommendations: [{ skillId: "a" }] });
  state = skillsReducer(state, { type: "skill.pinned", skillId: "b", scope: "global" });
  assert.deepEqual(selectSkillState(state, "a", "P"), {
    available: true, recommended: true, attached: false, active: false,
    pinned: { global: false, project: false }
  });
  assert.equal(selectSkillState(state, "b", "P").pinned.global, true);
  assert.deepEqual(selectCounts(state, "P"), { available: 2, recommended: 1, attached: 0, active: 0, pinned: 1 });
});

test("T9.4: attach e evento skill.activated atualizam somente seus estados", () => {
  let state = skillsReducer(initialSkillsState(), { type: "catalog.loaded", skills: [{ id: "a" }] });
  state = skillsReducer(state, { type: "skill.attached", skillId: "a", projectId: "P" });
  state = skillsReducer(state, { type: "skill.activated", skillId: "a", projectId: "P" });
  const selected = selectSkillState(state, "a", "P");
  assert.equal(selected.attached, true);
  assert.equal(selected.active, true);
  assert.equal(selected.recommended, false);
});

test("T9.4: pins de projeto ficam isolados", () => {
  let state = skillsReducer(initialSkillsState(), { type: "catalog.loaded", skills: [{ id: "a" }] });
  state = skillsReducer(state, { type: "skill.pinned", skillId: "a", scope: "project", projectId: "A" });
  assert.equal(selectSkillState(state, "a", "A").pinned.project, true);
  assert.equal(selectSkillState(state, "a", "B").pinned.project, false);
});

test("T9.4: preferência valida providers e nunca contamina SemanticTask", () => {
  assert.deepEqual(validatePreferences({ tier: "reasoning", preferredProvider: "codex", preferredModel: "gpt-x" }), {
    tier: "reasoning", preferredProvider: "codex", preferredModel: "gpt-x"
  });
  assert.throws(() => validatePreferences({ preferredProvider: "unknown" }), /preferredProvider/);
  assert.throws(() => toSemanticTaskInput({ preferredProvider: "codex", preferredModel: "gpt-x" }), /ROUTING_CONTAMINATION/);
});

test("T9.4: config ausente retorna defaults sem erro", () => {
  const missing = path.join(os.tmpdir(), `missing-skills-preferences-${process.pid}.json`);
  assert.deepEqual(parsePreferences(missing), DEFAULT_PREFERENCES);
});
