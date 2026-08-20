"use strict";

const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const { SkillCatalog } = require("../runtime/skills/intelligence/catalog");
const { searchSkills } = require("../runtime/skills/intelligence/search");
const { recommendForProject } = require("../runtime/skills/intelligence/recommend");

test("S1/S2 — SkillCatalog: Normalizes skills with precedence and lists installed skills", () => {
  const root = path.resolve(__dirname, "..");
  const catalog = new SkillCatalog({ maestroRoot: root, projectRoot: root });

  const all = catalog.getAll();
  assert.ok(Array.isArray(all));
  assert.ok(all.length > 0, "Should load installed skills");

  const first = all[0];
  assert.ok(first.id);
  assert.ok(first.displayName);
  assert.ok(first.source);
  assert.ok(first.normalizedCategory);
});

test("S1/S2 — Skill Search: Fuzzy matches skill names, triggers, and categories", () => {
  const sampleSkills = [
    { id: "react-dev", displayName: "React Development", description: "Frontend engineering for React applications", normalizedCategory: "Frontend", triggers: ["react", "jsx"] },
    { id: "database-ops", displayName: "Database Operations", description: "PostgreSQL and SQLite migrations", normalizedCategory: "Backend", triggers: ["db", "sql"] }
  ];

  const res = searchSkills(sampleSkills, "react");
  assert.ok(res.results.length > 0);
  assert.strictEqual(sampleSkills[res.results[0].index].id, "react-dev");
});

test("S1/S2 — Skill Recommendations: Produces explainable recommendations with confidence and evidence", () => {
  const sampleSkills = [
    { id: "react-dev", displayName: "React Development", description: "React tools", rawCategory: "frontend", normalizedCategory: "Frontend", triggers: ["react"] },
    { id: "docker-ops", displayName: "Docker Operations", description: "Containers", rawCategory: "infra", normalizedCategory: "Other", triggers: ["docker"] }
  ];

  const recs = recommendForProject(sampleSkills, "proj-web", {
    projectStack: ["react", "typescript"],
    missionBrief: "Refatorar componentes React"
  });

  assert.ok(recs.length > 0);
  const top = recs[0];
  assert.strictEqual(top.skillId, "react-dev");
  assert.ok(top.confidence >= 0.5);
  assert.ok(Array.isArray(top.reasons));
  assert.ok(top.reasons.length > 0);
  assert.ok(Array.isArray(top.evidence));
});

test("S1 — Safety Invariant: Community skills are marked unverified and not auto-installed", () => {
  const root = path.resolve(__dirname, "..");
  const catalog = new SkillCatalog({ maestroRoot: root });
  const community = catalog.availableCommunity();

  for (const skill of community) {
    assert.strictEqual(skill.source, "community");
    assert.strictEqual(skill.verification, "unverified");
    assert.strictEqual(skill.installed, false);
  }
});
