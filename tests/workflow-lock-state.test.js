const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const cli = path.join(repoRoot, "bin", "orquestrador-maestro.js");

function makeProject() {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "orquestrador-workflow-"));
  fs.mkdirSync(path.join(project, ".git"));
  fs.writeFileSync(path.join(project, ".gitignore"), ".local/\n", "utf8");
  fs.mkdirSync(path.join(project, "DEV", "WORKFLOWS"), { recursive: true });
  fs.writeFileSync(path.join(project, "AGENTS.md"), "# Temp project\n", "utf8");
  return project;
}

function run(project, args) {
  return spawnSync(process.execPath, [cli, ...args], { cwd: repoRoot, encoding: "utf8" });
}

test("workflow lock/state executam round-trip com gates e digest", () => {
  const project = makeProject();
  const base = ["--project-path", project];

  let result = run(project, ["workflow-lock", "generate", ...base, "--task-id", "task/demo-lock"]);
  assert.equal(result.status, 0, result.stderr);
  const lockPath = path.join(project, "DEV", "WORKFLOWS", "demo-lock.lock.json");
  assert.ok(fs.existsSync(lockPath));

  result = run(project, ["workflow-lock", "validate", ...base, "--lockfile", "DEV/WORKFLOWS/demo-lock.lock.json"]);
  assert.equal(result.status, 0, result.stderr);
  result = run(project, ["workflow-state", "init", ...base, "--lockfile", "DEV/WORKFLOWS/demo-lock.lock.json"]);
  assert.equal(result.status, 0, result.stderr);
  const statePath = path.join(project, ".local", "orquestrador", "workflow-state", "demo-lock.json");
  assert.ok(fs.existsSync(statePath));

  result = run(project, ["workflow-state", "advance", ...base, "--task-id", "task/demo-lock", "--to-step", "plan"]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Gate humano pendente/);
  const beforeApproval = fs.readFileSync(statePath, "utf8");

  result = run(project, ["workflow-state", "approve", ...base, "--task-id", "task/demo-lock", "--kind", "plan", "--by", "test-human"]);
  assert.equal(result.status, 0, result.stderr);
  result = run(project, ["workflow-state", "advance", ...base, "--task-id", "task/demo-lock", "--to-step", "plan"]);
  assert.equal(result.status, 0, result.stderr);
  assert.notEqual(fs.readFileSync(statePath, "utf8"), beforeApproval);

  const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  lock.workflow = "review-security";
  fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, "utf8");
  result = run(project, ["workflow-state", "validate", ...base, "--task-id", "task/demo-lock"]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /lock-drift/);
});

test("workflow lock não sobrescreve arquivo sem --force e state exige .local ignorado", () => {
  const project = makeProject();
  const base = ["--project-path", project];
  let result = run(project, ["workflow-lock", "generate", ...base, "--task-id", "task/no-overwrite"]);
  assert.equal(result.status, 0, result.stderr);
  result = run(project, ["workflow-lock", "generate", ...base, "--task-id", "task/no-overwrite"]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /já existe/);

  fs.writeFileSync(path.join(project, ".gitignore"), "", "utf8");
  result = run(project, ["workflow-state", "init", ...base, "--lockfile", "DEV/WORKFLOWS/no-overwrite.lock.json"]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /\.local/);
  assert.equal(fs.existsSync(path.join(project, ".local")), false);
});
