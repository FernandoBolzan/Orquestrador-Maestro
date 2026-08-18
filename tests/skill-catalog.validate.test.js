"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const { makeTempDir, writeFile } = require("./test-helpers.js");

const repoRoot = path.resolve(__dirname, "..");
const sourceScriptPath = path.join(repoRoot, "scripts", "skill-catalog.js");

function makeCatalogFixture({ routerSkills, skillText }) {
  const root = makeTempDir("orquestrador-skill-catalog-");
  writeFile(root, "scripts/skill-catalog.js", fs.readFileSync(sourceScriptPath, "utf8"));
  writeFile(root, "orquestrador/SKILLS_MANIFEST.json", JSON.stringify({
    version: 1,
    purpose: "test manifest",
    skills: {
      "skill-phase-router": {
        description: "Validate phase router coverage.",
        category: "workflow",
        risk: "medium",
        source: "test",
        status: "canonical"
      }
    }
  }, null, 2));
  writeFile(root, "orquestrador/SKILLS_ROUTER.json", JSON.stringify({
    skills: routerSkills
  }, null, 2));
  writeFile(root, "orquestrador/SKILL_ALIASES.json", JSON.stringify({ aliases: {} }, null, 2));
  writeFile(root, "orquestrador/SKILL_CHAINS.json", JSON.stringify({ chains: {} }, null, 2));
  writeFile(root, "orquestrador/skills/skill-phase-router/SKILL.md", skillText);
  return root;
}

test("skill-catalog validate fails when a manifest skill has no router entry", () => {
  const fixtureRoot = makeCatalogFixture({
    routerSkills: {},
    skillText: [
      "---",
      "name: skill-phase-router",
      "description: Validate phase router coverage.",
      "category: workflow",
      "risk: medium",
      "source: test",
      "---",
      "",
      "# Skill",
      "",
      "Stable content."
    ].join("\n")
  });

  const result = spawnSync(process.execPath, [
    path.join(fixtureRoot, "scripts", "skill-catalog.js"),
    "validate"
  ], {
    cwd: fixtureRoot,
    encoding: "utf8"
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /router:skill-phase-router: missing router entry/u);
});

test("skill-catalog validate fails when a skill file contains mojibake", () => {
  const fixtureRoot = makeCatalogFixture({
    routerSkills: {
      "skill-phase-router": {
        description: "Validate phase router coverage.",
        triggers: ["phase router"],
        canonicalPath: "{{USER_HOME}}/.orquestrador/skills/skill-phase-router/SKILL.md",
        codexPath: "{{USER_HOME}}/.codex/skills/skill-phase-router/SKILL.md",
        cost: "medium",
        safety: "task-specific-guardrails"
      }
    },
    skillText: [
      "---",
      "name: skill-phase-router",
      "description: Validate phase router coverage.",
      "category: workflow",
      "risk: medium",
      "source: test",
      "---",
      "",
      "# Skill",
      "",
      "Pr" + String.fromCodePoint(0xC3, 0xB3) + "xima fase do workflow."
    ].join("\n")
  });

  const result = spawnSync(process.execPath, [
    path.join(fixtureRoot, "scripts", "skill-catalog.js"),
    "validate"
  ], {
    cwd: fixtureRoot,
    encoding: "utf8"
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /skills\/skill-phase-router\/SKILL\.md: possible mojibake/u);
});

test("skill-catalog validate fails when triggers are ambiguous", () => {
  const fixtureRoot = makeCatalogFixture({
    routerSkills: {
      "skill-phase-router": {
        description: "Validate phase router coverage.",
        triggers: ["phase router"],
        canonicalPath: "{{USER_HOME}}/.orquestrador/skills/skill-phase-router/SKILL.md",
        codexPath: "{{USER_HOME}}/.codex/skills/skill-phase-router/SKILL.md",
        cost: "medium",
        safety: "task-specific-guardrails"
      },
      "skill-phase-secondary": {
        description: "Validate secondary phase routing.",
        triggers: ["phase router"],
        canonicalPath: "{{USER_HOME}}/.orquestrador/skills/skill-phase-secondary/SKILL.md",
        codexPath: "{{USER_HOME}}/.codex/skills/skill-phase-secondary/SKILL.md",
        cost: "medium",
        safety: "task-specific-guardrails"
      }
    },
    skillText: "---\nname: skill-phase-router\ndescription: Validate phase router coverage.\ncategory: workflow\nrisk: medium\nsource: test\n---\n\nStable content."
  });
  const manifest = JSON.parse(fs.readFileSync(path.join(fixtureRoot, "orquestrador/SKILLS_MANIFEST.json"), "utf8"));
  manifest.skills["skill-phase-secondary"] = { ...manifest.skills["skill-phase-router"] };
  writeFile(fixtureRoot, "orquestrador/SKILLS_MANIFEST.json", JSON.stringify(manifest, null, 2));
  writeFile(fixtureRoot, "orquestrador/skills/skill-phase-secondary/SKILL.md", "---\nname: skill-phase-secondary\ndescription: Validate secondary phase routing.\ncategory: workflow\nrisk: medium\nsource: test\n---\n\nStable content.");
  const result = spawnSync(process.execPath, [path.join(fixtureRoot, "scripts", "skill-catalog.js"), "validate"], { cwd: fixtureRoot, encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /ambiguous trigger owners/u);
});

test("skill-catalog validate fails when chains contain a cycle", () => {
  const fixtureRoot = makeCatalogFixture({
    routerSkills: {
      "skill-phase-router": {
        description: "Validate phase router coverage.",
        triggers: ["phase router"],
        canonicalPath: "{{USER_HOME}}/.orquestrador/skills/skill-phase-router/SKILL.md",
        codexPath: "{{USER_HOME}}/.codex/skills/skill-phase-router/SKILL.md",
        cost: "medium",
        safety: "task-specific-guardrails"
      }
    },
    skillText: "---\nname: skill-phase-router\ndescription: Validate phase router coverage.\ncategory: workflow\nrisk: medium\nsource: test\n---\n\nStable content."
  });
  writeFile(fixtureRoot, "orquestrador/SKILL_CHAINS.json", JSON.stringify({ chains: {
    "skill-phase-router": { mayInvoke: ["skill-phase-router"] }
  } }, null, 2));
  const result = spawnSync(process.execPath, [path.join(fixtureRoot, "scripts", "skill-catalog.js"), "validate"], { cwd: fixtureRoot, encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /cycle detected/u);
});
