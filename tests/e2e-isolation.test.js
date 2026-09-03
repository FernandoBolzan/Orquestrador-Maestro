const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execSync, execFileSync } = require("node:child_process");

const { Memory } = require("../orquestrador/bin/memory.js");
const { resolveGitContext } = require("../orquestrador/lib/git-context.js");
const { isObservationVisible, resolveObservationScope } = require("../orquestrador/lib/visibility.js");
const { buildBrief } = require("../orquestrador/bin/context-brief.js");

function createGitRepo() {
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), "e2e-repo-"));
  execSync("git init -b main", { cwd: repoDir, stdio: "pipe" });
  execSync("git config user.email 'test@test.com'", { cwd: repoDir, stdio: "pipe" });
  execSync("git config user.name 'Test'", { cwd: repoDir, stdio: "pipe" });
  execSync("git remote add origin https://github.com/test/repo.git", { cwd: repoDir, stdio: "pipe" });
  execSync("git commit --allow-empty -m 'initial'", { cwd: repoDir, stdio: "pipe" });
  return repoDir;
}

describe("End-to-End Branch Isolation", () => {
  let repoDir;
  let tmpDir;
  let memory;

  beforeEach(() => {
    repoDir = createGitRepo();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "e2e-memory-"));
    memory = new Memory({ baseDir: tmpDir });
  });

  afterEach(() => {
    fs.rmSync(repoDir, { recursive: true, force: true });
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should isolate branch observations with real git checkout", () => {
    execSync("git checkout -b feat-a", { cwd: repoDir, stdio: "pipe" });

    const ctxA = resolveGitContext(repoDir);
    const projectId = ctxA.repositoryId;

    memory.record(projectId, {
      type: "discovery",
      summary: "Repository shared observation",
      scope: { level: "repository", repositoryId: ctxA.repositoryId }
    }, { gitContext: ctxA, projectRoot: repoDir });

    memory.record(projectId, {
      type: "discovery",
      summary: "Feat-A specific observation",
      scope: { level: "branch", repositoryId: ctxA.repositoryId, branch: "feat-a" }
    }, { gitContext: ctxA, projectRoot: repoDir });

    execSync("git checkout -b feat-b", { cwd: repoDir, stdio: "pipe" });

    const ctxB = resolveGitContext(repoDir);

    memory.record(projectId, {
      type: "discovery",
      summary: "Feat-B specific observation",
      scope: { level: "branch", repositoryId: ctxB.repositoryId, branch: "feat-b" }
    }, { gitContext: ctxB, projectRoot: repoDir });

    execSync("git checkout feat-a", { cwd: repoDir, stdio: "pipe" });
    const ctxARetrieve = resolveGitContext(repoDir);

    const visibleA = memory.searchWithVisibility(projectId, ctxARetrieve, { search: "observation" });
    assert.ok(visibleA.some(o => o.summary.includes("Repository shared")));
    assert.ok(visibleA.some(o => o.summary.includes("Feat-A specific")));
    assert.ok(!visibleA.some(o => o.summary.includes("Feat-B specific")));

    execSync("git checkout feat-b", { cwd: repoDir, stdio: "pipe" });
    const ctxBRetrieve = resolveGitContext(repoDir);

    const visibleB = memory.searchWithVisibility(projectId, ctxBRetrieve, { search: "observation" });
    assert.ok(visibleB.some(o => o.summary.includes("Repository shared")));
    assert.ok(!visibleB.some(o => o.summary.includes("Feat-A specific")));
    assert.ok(visibleB.some(o => o.summary.includes("Feat-B specific")));
  });

  it("should produce correct scope with resolveObservationScope", () => {
    const ctx = resolveGitContext(repoDir);
    const scope = resolveObservationScope({
      type: "decision",
      gitContext: ctx,
      explicitScope: null
    });

    assert.equal(scope.level, "branch");
    assert.equal(scope.repositoryId, ctx.repositoryId);
    assert.equal(scope.branch, ctx.branch);
    assert.equal(scope.workspaceId, ctx.workspaceId);
  });
});

describe("End-to-End Worktree Isolation", () => {
  let repoDir;
  let worktreeA;
  let worktreeB;
  let tmpDir;
  let memory;

  beforeEach(() => {
    repoDir = createGitRepo();
    worktreeA = path.join(repoDir, "wt-a");
    worktreeB = path.join(repoDir, "wt-b");
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "e2e-memory-"));
    memory = new Memory({ baseDir: tmpDir });

    execSync(`git worktree add ${worktreeA} -b feat-a`, { cwd: repoDir, stdio: "pipe" });
    execSync(`git worktree add ${worktreeB} -b feat-b`, { cwd: repoDir, stdio: "pipe" });
  });

  afterEach(() => {
    try { execSync(`git worktree remove ${worktreeA} --force`, { cwd: repoDir, stdio: "pipe" }); } catch {}
    try { execSync(`git worktree remove ${worktreeB} --force`, { cwd: repoDir, stdio: "pipe" }); } catch {}
    fs.rmSync(repoDir, { recursive: true, force: true });
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should isolate workspace observations across worktrees", () => {
    const ctxA = resolveGitContext(worktreeA);
    const ctxB = resolveGitContext(worktreeB);
    const projectId = ctxA.repositoryId;

    assert.equal(ctxA.repositoryId, ctxB.repositoryId);
    assert.notEqual(ctxA.workspaceId, ctxB.workspaceId);
    assert.notEqual(ctxA.branch, ctxB.branch);

    memory.record(projectId, {
      type: "discovery",
      summary: "Repository shared",
      scope: { level: "repository", repositoryId: ctxA.repositoryId }
    }, { gitContext: ctxA, projectRoot: worktreeA });

    memory.record(projectId, {
      type: "discovery",
      summary: "Workspace A specific",
      scope: { level: "workspace", repositoryId: ctxA.repositoryId, workspaceId: ctxA.workspaceId, branch: "feat-a" }
    }, { gitContext: ctxA, projectRoot: worktreeA });

    memory.record(projectId, {
      type: "discovery",
      summary: "Workspace B specific",
      scope: { level: "workspace", repositoryId: ctxB.repositoryId, workspaceId: ctxB.workspaceId, branch: "feat-b" }
    }, { gitContext: ctxB, projectRoot: worktreeB });

    const visibleFromA = memory.searchWithVisibility(projectId, ctxA, {});
    const allObs = memory.search(projectId);
    assert.ok(visibleFromA.some(o => o.summary.includes("Repository shared")), `Expected "Repository shared" in visibleFromA (total visible: ${visibleFromA.length}, total all: ${allObs.length}), visible summaries: ${JSON.stringify(visibleFromA.map(o => o.summary))}`);
    assert.ok(visibleFromA.some(o => o.summary.includes("Workspace A specific")), `Expected "Workspace A specific" in visibleFromA`);
    assert.ok(!visibleFromA.some(o => o.summary.includes("Workspace B specific")), `Expected no "Workspace B specific" in visibleFromA`);

    const visibleFromB = memory.searchWithVisibility(projectId, ctxB, {});
    assert.ok(visibleFromB.some(o => o.summary.includes("Repository shared")), `Expected "Repository shared" in visibleFromB, got: ${JSON.stringify(visibleFromB.map(o => o.summary))}`);
    assert.ok(!visibleFromB.some(o => o.summary.includes("Workspace A specific")), `Expected no "Workspace A specific" in visibleFromB`);
    assert.ok(visibleFromB.some(o => o.summary.includes("Workspace B specific")), `Expected "Workspace B specific" in visibleFromB`);
  });
});

describe("End-to-End Detached HEAD", () => {
  let repoDir;
  let tmpDir;
  let memory;

  beforeEach(() => {
    repoDir = createGitRepo();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "e2e-memory-"));
    memory = new Memory({ baseDir: tmpDir });
  });

  afterEach(() => {
    fs.rmSync(repoDir, { recursive: true, force: true });
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should handle detached HEAD with valid identity", () => {
    const headSha = execSync("git rev-parse HEAD", { cwd: repoDir, encoding: "utf8" }).trim();
    execSync("git checkout " + headSha, { cwd: repoDir, stdio: "pipe" });

    const ctx = resolveGitContext(repoDir);
    assert.equal(ctx.detached, true);
    assert.equal(ctx.branch, null);
    assert.equal(ctx.headCommit, headSha);
    assert.ok(ctx.repositoryId);
    assert.ok(ctx.workspaceId);

    const scope = resolveObservationScope({
      type: "discovery",
      gitContext: ctx,
      explicitScope: null
    });
    assert.equal(scope.level, "commit");
    assert.equal(scope.headCommit, headSha);
  });
});

describe("End-to-End Rebase", () => {
  let repoDir;
  let tmpDir;
  let memory;

  beforeEach(() => {
    repoDir = createGitRepo();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "e2e-memory-"));
    memory = new Memory({ baseDir: tmpDir });
  });

  afterEach(() => {
    fs.rmSync(repoDir, { recursive: true, force: true });
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should preserve branch-scoped observations after rebase", () => {
    execSync("git checkout -b feat-branch", { cwd: repoDir, stdio: "pipe" });

    const ctxFeat = resolveGitContext(repoDir);
    const projectId = ctxFeat.repositoryId;

    memory.record(projectId, {
      type: "discovery",
      summary: "Feature branch observation",
      scope: { level: "branch", repositoryId: ctxFeat.repositoryId, branch: "feat-branch" }
    }, { gitContext: ctxFeat, projectRoot: repoDir });

    execSync("git checkout main", { cwd: repoDir, stdio: "pipe" });
    execSync("git commit --allow-empty -m 'main commit C'", { cwd: repoDir, stdio: "pipe" });

    execSync("git checkout feat-branch", { cwd: repoDir, stdio: "pipe" });
    execSync("git rebase main", { cwd: repoDir, stdio: "pipe" });

    const ctxAfter = resolveGitContext(repoDir);
    const visible = memory.searchWithVisibility(projectId, ctxAfter, { search: "Feature branch" });
    assert.ok(visible.some(o => o.summary.includes("Feature branch observation")));
  });
});

describe("End-to-End Concurrency", () => {
  let tmpDir;
  let memory;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "e2e-concurrency-"));
    memory = new Memory({ baseDir: tmpDir });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should handle concurrent record operations without data loss", () => {
    const projectId = "concurrent-test";
    memory.ensureProjectDir(projectId);

    const workers = 5;
    const perWorker = 20;
    const projectRoot = path.resolve(__dirname, "..");
    const workerScript = path.join(__dirname, "worker-record.js");

    const results = [];
    for (let w = 0; w < workers; w++) {
      const out = execFileSync(process.execPath, [workerScript, projectRoot, tmpDir, projectId, String(w), String(perWorker)], {
        encoding: "utf8",
        timeout: 30000
      });
      results.push(JSON.parse(out.trim()));
    }

    const totalRecorded = results.reduce((sum, r) => sum + r.recorded, 0);
    assert.equal(totalRecorded, workers * perWorker);

    const filePath = memory.getObservationsFile(projectId);
    const { valid, malformed } = memory.readObservations(filePath);
    assert.equal(valid.length, workers * perWorker);
    assert.equal(malformed, 0);
  });

  it("should handle concurrent dedupe without corruption", () => {
    const projectId = "concurrent-dedupe";

    for (let i = 0; i < 20; i++) {
      memory.record(projectId, {
        type: "discovery",
        summary: `Observation ${i % 5}`
      });
    }

    memory.dedupe(projectId);

    const filePath = memory.getObservationsFile(projectId);
    const { valid } = memory.readObservations(filePath);
    assert.ok(valid.length > 0);
    assert.ok(valid.length <= 20);
  });
});

describe("End-to-End Canonical Conflict", () => {
  let tmpDir;
  let memory;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "e2e-canonical-"));
    memory = new Memory({ baseDir: tmpDir });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should prioritize canonical over memory in context brief", () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "brief-project-"));
    fs.mkdirSync(path.join(projectRoot, "DEV"), { recursive: true });
    fs.writeFileSync(path.join(projectRoot, "DEV", "README.md"), "# Project\nFramework: React", "utf8");

    const projectId = memory.resolveRepositoryId(projectRoot);
    memory.record(projectId, {
      type: "decision",
      summary: "Framework = Vue",
      tags: ["framework"],
      verified: true
    });

    try {
      const result = buildBrief({
        projectPath: projectRoot,
        task: "what framework do we use",
        maxChars: 16000,
        memory
      });

      assert.ok(result.content.includes("React"));
      assert.ok(!result.content.includes("Vue"));
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});

describe("End-to-End Visibility Policy", () => {
  it("should block cross-branch visibility", () => {
    const obs = {
      scope: { level: "branch", repositoryId: "repo_abc", branch: "feat-a" }
    };
    const ctx = { repositoryId: "repo_abc", branch: "feat-b", workspaceId: "ws_1", detached: false };
    assert.equal(isObservationVisible(obs, ctx), false);
  });

  it("should allow same-branch visibility", () => {
    const obs = {
      scope: { level: "branch", repositoryId: "repo_abc", branch: "feat-a" }
    };
    const ctx = { repositoryId: "repo_abc", branch: "feat-a", workspaceId: "ws_1", detached: false };
    assert.equal(isObservationVisible(obs, ctx), true);
  });

  it("should block cross-workspace visibility", () => {
    const obs = {
      scope: { level: "workspace", repositoryId: "repo_abc", workspaceId: "ws_1" }
    };
    const ctx = { repositoryId: "repo_abc", branch: "feat-a", workspaceId: "ws_2", detached: false };
    assert.equal(isObservationVisible(obs, ctx), false);
  });

  it("should allow repository visibility across branches", () => {
    const obs = {
      scope: { level: "repository", repositoryId: "repo_abc" }
    };
    const ctx = { repositoryId: "repo_abc", branch: "feat-a", workspaceId: "ws_1", detached: false };
    assert.equal(isObservationVisible(obs, ctx), true);
  });

  it("should block different repository", () => {
    const obs = {
      scope: { level: "repository", repositoryId: "repo_xyz" }
    };
    const ctx = { repositoryId: "repo_abc", branch: "feat-a", workspaceId: "ws_1", detached: false };
    assert.equal(isObservationVisible(obs, ctx), false);
  });

  it("should block detached HEAD for branch-scoped", () => {
    const obs = {
      scope: { level: "branch", repositoryId: "repo_abc", branch: "feat-a" }
    };
    const ctx = { repositoryId: "repo_abc", branch: null, workspaceId: "ws_1", detached: true };
    assert.equal(isObservationVisible(obs, ctx), false);
  });

  it("should allow task-scoped with matching taskId", () => {
    const obs = {
      scope: { level: "task", repositoryId: "repo_abc", taskId: "task-1" }
    };
    const ctx = { repositoryId: "repo_abc", branch: "feat-a", workspaceId: "ws_1", detached: false };
    assert.equal(isObservationVisible(obs, ctx, { taskId: "task-1" }), true);
  });

  it("should block task-scoped with different taskId", () => {
    const obs = {
      scope: { level: "task", repositoryId: "repo_abc", taskId: "task-1" }
    };
    const ctx = { repositoryId: "repo_abc", branch: "feat-a", workspaceId: "ws_1", detached: false };
    assert.equal(isObservationVisible(obs, ctx, { taskId: "task-2" }), false);
  });
});
