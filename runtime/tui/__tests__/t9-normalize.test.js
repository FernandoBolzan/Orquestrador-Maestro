"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { normalizeSkills, normalizeCategory, CATEGORY_MAP } = require("../skills/normalize");
const { SkillRegistry } = require("../../skills/registry");

function fixtureRegistry() {
  return new SkillRegistry({
    maestroRoot: path.resolve(__dirname, "../../.."),
    userHome: path.join(__dirname, "fixtures", "home"),
    projectRoot: path.join(__dirname, "fixtures", "project")
  });
}

test("T9.1: skills reais carregadas com rawCategory verbatim do manifesto", () => {
  const views = normalizeSkills(fixtureRegistry());
  const maestro = views.filter((v) => v.namespace === "maestro");
  const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../orquestrador/SKILLS_MANIFEST.json"), "utf8"));
  assert.equal(maestro.length, Object.keys(manifest.skills).length, "catálogo carregado deve refletir o manifesto");
  for (const v of maestro) {
    const raw = manifest.skills[v.id] && manifest.skills[v.id].category;
    assert.equal(v.rawCategory, raw || "", `rawCategory verbatim for ${v.id}`);
  }
});

test("T9.1: contagem normalizada bate com o mapeamento oficial do manifesto", () => {
  const views = normalizeSkills(fixtureRegistry()).filter((v) => v.namespace === "maestro");
  const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../orquestrador/SKILLS_MANIFEST.json"), "utf8"));
  const count = {};
  for (const v of views) count[v.normalizedCategory] = (count[v.normalizedCategory] || 0) + 1;
  const expectation = {};
  for (const skill of Object.values(manifest.skills)) {
    const category = normalizeCategory(skill.category);
    expectation[category] = (expectation[category] || 0) + 1;
  }
  assert.deepEqual(count, expectation);
});

test("T9.1: categoria sintética desconhecida cai em Other sem throw", () => {
  assert.equal(normalizeCategory("quantum"), "Other");
  assert.equal(normalizeCategory(""), "Other");
  assert.equal(normalizeCategory(null), "Other");
});

test("T9.1: campos extras do manifesto são preservados (mirrorEverywhere/provenance/workflow)", () => {
  const views = normalizeSkills(fixtureRegistry()).filter((v) => v.namespace === "maestro");
  const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../orquestrador/SKILLS_MANIFEST.json"), "utf8"));
  for (const v of views) {
    const raw = manifest.skills[v.id] || {};
    if (raw.mirrorEverywhere !== undefined) assert.deepEqual(v.mirrorEverywhere, raw.mirrorEverywhere);
    if (raw.provenance !== undefined) assert.deepEqual(v.provenance, raw.provenance);
    if (raw.workflow !== undefined) assert.deepEqual(v.workflow, raw.workflow);
    assert.equal(typeof v.risk, "string");
    assert.equal(typeof v.status, "string");
    assert.ok(Array.isArray(v.triggers) || Array.isArray(v.aliases), "triggers/aliases arrays exist");
  }
});

test("T9.1: normalização não modifica manifesto nem SKILL.md", () => {
  const manifestPath = path.resolve(__dirname, "../../../orquestrador/SKILLS_MANIFEST.json");
  const beforeManifest = fs.readFileSync(manifestPath);
  const registry = fixtureRegistry();
  const skillPath = registry.list().find((entry) => entry.namespace === "maestro").path;
  const beforeSkill = fs.readFileSync(path.join(skillPath, "SKILL.md"));
  normalizeSkills(registry, manifestPath);
  assert.deepEqual(fs.readFileSync(manifestPath), beforeManifest);
  assert.deepEqual(fs.readFileSync(path.join(skillPath, "SKILL.md")), beforeSkill);
});

test("T9.1: skill sem metadata (user/project vazio) → description '' e normalizedCategory Other", () => {
  const views = normalizeSkills(fixtureRegistry());
  const hollow = views.find(
    (v) => v.namespace !== "maestro" && (v.description === "" || v.rawCategory === "")
  );
  if (hollow) {
    assert.equal(hollow.normalizedCategory, "Other");
    assert.equal(typeof hollow.description, "string");
  } else {
    assert.equal(normalizeCategory(""), "Other");
  }
});

test("T9.1: CATEGORY_MAP cobre as 26 categorias raw reais e nada fica de fora", () => {
  const mapped = Object.values(CATEGORY_MAP).flat();
  const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../orquestrador/SKILLS_MANIFEST.json"), "utf8"));
  const rawCats = new Set(Object.values(manifest.skills).map((s) => s.category));
  for (const raw of rawCats) {
    assert.ok(mapped.includes(raw), `raw category "${raw}" must be in CATEGORY_MAP`);
  }
  assert.equal(new Set(mapped).size, mapped.length, "no duplicate raw across normalized groups");
});
