#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const os = require("node:os");
const { execSync } = require("node:child_process");

class RealBenchmarkRunner {
  constructor(options = {}) {
    this.scenariosDir = options.scenariosDir || path.join(__dirname, "scenarios");
    this.resultsDir = options.resultsDir || path.join(__dirname, "results", "real");
    this.repoCommit = options.repoCommit || this.getGitCommit();
  }

  getGitCommit() {
    try {
      return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    } catch {
      return "unknown";
    }
  }

  loadScenario(scenarioId) {
    const scenarioPath = path.join(this.scenariosDir, `${scenarioId}.json`);
    return JSON.parse(fs.readFileSync(scenarioPath, "utf8"));
  }

  listScenarios() {
    return fs.readdirSync(this.scenariosDir)
      .filter(f => f.endsWith(".json"))
      .map(f => f.replace(".json", ""));
  }

  calculatePromptHash(prompt) {
    return crypto.createHash("sha256").update(prompt).digest("hex");
  }

  getEnvironment() {
    return {
      os: `${os.type()} ${os.release()}`,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      timestamp: new Date().toISOString()
    };
  }

  setupFixture(fixture) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "maestro-real-bench-"));

    if (fixture && fixture.files) {
      for (const [filePath, content] of Object.entries(fixture.files)) {
        const fullPath = path.join(tmpDir, filePath);

        if (filePath.endsWith("/")) {
          if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
          }
          continue;
        }

        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        const contentStr = typeof content === "object" ? JSON.stringify(content, null, 2) : content;
        fs.writeFileSync(fullPath, contentStr, "utf8");
      }
    }

    return tmpDir;
  }

  measureContextSize(scenario, condition) {
    let context = `Task: ${scenario.prompt}\n\n`;

    if (condition === "maestro-core" || condition === "maestro-memory") {
      context += `Rules: Follow Orquestrador Maestro rules.\n`;
      context += `Context: Use minimal sufficient context.\n`;
      context += `Protocol: Observe → Route → Select → Act → Verify → Report.\n`;
    }

    if (scenario.fixture && scenario.fixture.files) {
      for (const [filePath, content] of Object.entries(scenario.fixture.files)) {
        const contentStr = typeof content === "object" ? JSON.stringify(content, null, 2) : content;
        context += `\nFile: ${filePath}\n${contentStr}\n`;
      }
    }

    return {
      chars: context.length,
      bytes: Buffer.byteLength(context, "utf8"),
      lines: context.split("\n").length
    };
  }

  validateScenario(projectDir, scenario) {
    if (!scenario.validation || !scenario.validation.command) {
      return { passed: true, testsPassed: 0, testsFailed: 0, output: "" };
    }

    try {
      const output = execSync(scenario.validation.command, {
        cwd: projectDir,
        encoding: "utf8",
        stdio: "pipe",
        timeout: 30000
      });
      return { passed: true, testsPassed: 1, testsFailed: 0, output };
    } catch (error) {
      return { passed: false, testsPassed: 0, testsFailed: 1, output: error.message };
    }
  }

  countFiles(dir) {
    let count = 0;
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        if (item.isFile()) count++;
        if (item.isDirectory()) {
          count += this.countFiles(path.join(dir, item.name));
        }
      }
    } catch {}
    return count;
  }

  runScenario(scenarioId, condition) {
    const scenario = this.loadScenario(scenarioId);
    const startTime = Date.now();

    const tmpDir = this.setupFixture(scenario.fixture);
    const contextSize = this.measureContextSize(scenario, condition);
    const validation = this.validateScenario(tmpDir, scenario);
    const filesInFixture = this.countFiles(tmpDir);

    const duration = Date.now() - startTime;

    const result = {
      benchmark: scenario.id,
      condition,
      run: 1,
      model: "none (measurement only)",
      provider: "none",
      repoCommit: this.repoCommit,
      promptHash: this.calculatePromptHash(scenario.prompt),
      environment: this.getEnvironment(),
      usage: {
        inputTokens: null,
        outputTokens: null,
        cachedTokens: null,
        reasoningTokens: null,
        totalTokens: null,
        tokenSource: "not-applicable"
      },
      context: {
        chars: contextSize.chars,
        bytes: contextSize.bytes,
        lines: contextSize.lines
      },
      tools: {
        calls: 0,
        filesRead: filesInFixture,
        filesModified: 0
      },
      validation: {
        passed: validation.passed,
        testsPassed: validation.testsPassed,
        testsFailed: validation.testsFailed
      },
      evidence: {
        executionType: "synthetic",
        publicClaimEligible: false,
        reproducible: true,
        isolated: true
      },
      metadata: {
        durationMs: duration,
        scenarioType: scenario.type,
        fixtureFiles: filesInFixture,
        notes: `Real measurement - no AI model execution`
      }
    };

    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}

    return result;
  }

  saveResult(result) {
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }

    const filename = `${result.benchmark}_${result.condition}.json`;
    const filepath = path.join(this.resultsDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(result, null, 2), "utf8");

    return filepath;
  }

  runAll() {
    const scenarios = this.listScenarios();
    const conditions = ["vanilla", "maestro-core", "maestro-memory"];
    const results = [];

    console.log("=== Real Benchmark Runner ===\n");
    console.log(`Scenarios: ${scenarios.length}`);
    console.log(`Conditions: ${conditions.length}`);
    console.log(`Total runs: ${scenarios.length * conditions.length}\n`);

    for (const scenarioId of scenarios) {
      console.log(`\n--- ${scenarioId} ---`);

      for (const condition of conditions) {
        process.stdout.write(`  ${condition}... `);

        const result = this.runScenario(scenarioId, condition);
        this.saveResult(result);
        results.push(result);

        console.log(`${result.metadata.durationMs}ms, ${result.context.chars} chars`);
      }
    }

    return results;
  }

  generateReport(results) {
    const report = {
      metadata: {
        timestamp: new Date().toISOString(),
        repoCommit: this.repoCommit,
        environment: this.getEnvironment(),
        totalRuns: results.length
      },
      summary: {},
      details: {}
    };

    const grouped = {};
    for (const result of results) {
      const key = `${result.benchmark}_${result.condition}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(result);
    }

    for (const [key, runs] of Object.entries(grouped)) {
      const contextChars = runs.map(r => r.context.chars);
      const contextBytes = runs.map(r => r.context.bytes);
      const durations = runs.map(r => r.metadata.durationMs);

      report.summary[key] = {
        runs: runs.length,
        contextChars: {
          min: Math.min(...contextChars),
          max: Math.max(...contextChars),
          median: this.median(contextChars)
        },
        contextBytes: {
          min: Math.min(...contextBytes),
          max: Math.max(...contextBytes),
          median: this.median(contextBytes)
        },
        durationMs: {
          min: Math.min(...durations),
          max: Math.max(...durations),
          median: this.median(durations)
        }
      };

      report.details[key] = runs;
    }

    return report;
  }

  median(values) {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }
}

if (require.main === module) {
  const runner = new RealBenchmarkRunner();
  const results = runner.runAll();

  const report = runner.generateReport(results);
  const reportPath = path.join(runner.resultsDir, "real-benchmark-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log("\n=== Summary ===\n");

  const byCondition = { vanilla: [], "maestro-core": [], "maestro-memory": [] };
  for (const result of results) {
    byCondition[result.condition].push(result);
  }

  for (const [condition, runs] of Object.entries(byCondition)) {
    const avgContext = runs.reduce((sum, r) => sum + r.context.chars, 0) / runs.length;
    const avgDuration = runs.reduce((sum, r) => sum + r.metadata.durationMs, 0) / runs.length;
    console.log(`${condition}:`);
    console.log(`  Avg context: ${Math.round(avgContext)} chars`);
    console.log(`  Avg duration: ${Math.round(avgDuration)}ms`);
  }

  console.log(`\nReport saved to: ${reportPath}`);
}

module.exports = { RealBenchmarkRunner };
