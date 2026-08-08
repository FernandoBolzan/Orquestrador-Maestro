const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

test("phase-loop and declarative workflows preserve the legacy profiles", () => {
  const profiles = readJson("orquestrador/SKILL_EXECUTION_PROFILES.json").profiles;
  const workflows = readJson("orquestrador/WORKFLOW_SCHEMAS.json");

  for (const profile of ["fast", "standard", "deep", "multiagent", "saas", "security"]) {
    assert.ok(profiles[profile], `legacy profile ${profile} must remain available`);
  }

  assert.deepEqual(profiles["phase-loop"].phases, ["discuss", "plan", "execute", "verify", "ship"]);
  assert.equal(profiles["phase-loop"].startSkill, "plan");
  assert.equal(workflows.defaultWorkflow, "plan-build-verify");
  assert.equal(workflows.workflows["plan-build-verify"].profile, "phase-loop");
  assert.ok(workflows.workflows["plan-build-verify"].gates.includes("tests"));
});
