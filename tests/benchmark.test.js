const { describe, it, expect, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const { BenchmarkRunner } = require("../benchmarks/runner.js");

describe("BenchmarkRunner", () => {
  let tmpDir;
  let runner;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bench-test-"));
    runner = new BenchmarkRunner({
      scenariosDir: path.join(__dirname, "..", "benchmarks", "scenarios"),
      resultsDir: path.join(tmpDir, "results"),
      model: "test-model",
      provider: "test-provider",
      repoCommit: "test-commit-123"
    });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("loadScenario", () => {
    it("should load a valid scenario", async () => {
      const scenario = await runner.loadScenario("feature-add-button");
      assert.equal(scenario.id, "feature-add-button");
      assert.equal(scenario.type, "feature");
      assert.ok(scenario.prompt);
      assert.ok(scenario.acceptance);
    });

    it("should throw for non-existent scenario", async () => {
      await assert.rejects(
        () => runner.loadScenario("non-existent"),
        /Scenario not found/
      );
    });
  });

  describe("listScenarios", () => {
    it("should list all scenarios", () => {
      const scenarios = runner.listScenarios();
      assert.ok(Array.isArray(scenarios));
      assert.ok(scenarios.length >= 6);
      assert.ok(scenarios.includes("feature-add-button"));
      assert.ok(scenarios.includes("bug-fix-auth"));
    });
  });

  describe("calculatePromptHash", () => {
    it("should calculate SHA-256 hash", () => {
      const hash = runner.calculatePromptHash("test prompt");
      assert.equal(hash.length, 64);
      assert.match(hash, /^[a-f0-9]{64}$/);
    });

    it("should produce consistent hashes", () => {
      const hash1 = runner.calculatePromptHash("test prompt");
      const hash2 = runner.calculatePromptHash("test prompt");
      assert.equal(hash1, hash2);
    });

    it("should produce different hashes for different inputs", () => {
      const hash1 = runner.calculatePromptHash("prompt 1");
      const hash2 = runner.calculatePromptHash("prompt 2");
      assert.notEqual(hash1, hash2);
    });
  });

  describe("getEnvironment", () => {
    it("should return environment info", () => {
      const env = runner.getEnvironment();
      assert.ok(env.os);
      assert.ok(env.nodeVersion);
      assert.ok(env.platform);
      assert.ok(env.arch);
      assert.ok(env.timestamp);
    });
  });

  describe("setupFixture", () => {
    it("should create temporary directory with files", async () => {
      const fixture = {
        files: {
          "test.txt": "hello world",
          "subdir/nested.txt": "nested content"
        }
      };

      const tmpDir = await runner.setupFixture(fixture);
      assert.ok(fs.existsSync(tmpDir));
      assert.ok(fs.existsSync(path.join(tmpDir, "test.txt")));
      assert.ok(fs.existsSync(path.join(tmpDir, "subdir", "nested.txt")));
      assert.equal(fs.readFileSync(path.join(tmpDir, "test.txt"), "utf8"), "hello world");
      
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("should handle empty fixture", async () => {
      const tmpDir = await runner.setupFixture({});
      assert.ok(fs.existsSync(tmpDir));
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });

  describe("runScenario", () => {
    it("should run a scenario and return result", async () => {
      const result = await runner.runScenario("feature-add-button", "vanilla", 1);
      
      assert.equal(result.benchmark, "feature-add-button");
      assert.equal(result.condition, "vanilla");
      assert.equal(result.run, 1);
      assert.equal(result.model, "test-model");
      assert.equal(result.provider, "test-provider");
      assert.equal(result.repoCommit, "test-commit-123");
      assert.ok(result.promptHash);
      assert.ok(result.environment);
      assert.ok(result.usage);
      assert.ok(result.context);
      assert.ok(result.tools);
      assert.ok(result.validation);
      assert.ok(result.metadata);
    });
  });

  describe("saveResult", () => {
    it("should save result to file", async () => {
      const result = await runner.runScenario("feature-add-button", "vanilla", 1);
      const filepath = runner.saveResult(result);
      
      assert.ok(fs.existsSync(filepath));
      const saved = JSON.parse(fs.readFileSync(filepath, "utf8"));
      assert.equal(saved.benchmark, "feature-add-button");
    });
  });

  describe("generateReport", () => {
    it("should generate report from results", () => {
      const results = [
        { benchmark: "test", condition: "vanilla", run: 1, validation: { passed: true }, usage: { inputTokens: 100 }, metadata: { durationMs: 1000 } },
        { benchmark: "test", condition: "vanilla", run: 2, validation: { passed: true }, usage: { inputTokens: 120 }, metadata: { durationMs: 1100 } },
        { benchmark: "test", condition: "maestro-core", run: 1, validation: { passed: false }, usage: { inputTokens: 80 }, metadata: { durationMs: 900 } }
      ];

      const report = runner.generateReport(results);
      
      assert.ok(report.summary);
      assert.ok(report.details);
      assert.ok(report.summary.allRuns);
      assert.ok(report.summary.allRuns["test_vanilla"]);
      assert.equal(report.summary.allRuns["test_vanilla"].totalRuns, 2);
      assert.equal(report.summary.allRuns["test_vanilla"].successfulRuns, 2);
      assert.equal(report.summary.allRuns["test_vanilla"].successRate, 1);
    });
  });

  describe("median", () => {
    it("should calculate median of odd-length array", () => {
      assert.equal(runner.median([1, 2, 3]), 2);
    });

    it("should calculate median of even-length array", () => {
      assert.equal(runner.median([1, 2, 3, 4]), 2.5);
    });

    it("should return null for empty array", () => {
      assert.equal(runner.median([]), null);
    });

    it("should handle single element", () => {
      assert.equal(runner.median([5]), 5);
    });
  });
});