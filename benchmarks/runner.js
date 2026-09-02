#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const os = require("node:os");

const BENCHMARK_SCHEMA = require("../orquestrador/schemas/BENCHMARK_SCHEMA.json");

class BenchmarkRunner {
  constructor(options = {}) {
    this.scenariosDir = options.scenariosDir || path.join(__dirname, "scenarios");
    this.resultsDir = options.resultsDir || path.join(__dirname, "results");
    this.repoCommit = options.repoCommit || "unknown";
    this.model = options.model || "unknown";
    this.provider = options.provider || "unknown";
  }

  async loadScenario(scenarioId) {
    const scenarioPath = path.join(this.scenariosDir, `${scenarioId}.json`);
    if (!fs.existsSync(scenarioPath)) {
      throw new Error(`Scenario not found: ${scenarioId}`);
    }
    return JSON.parse(fs.readFileSync(scenarioPath, "utf8"));
  }

  listScenarios() {
    if (!fs.existsSync(this.scenariosDir)) {
      return [];
    }
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

  async setupFixture(fixture) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "maestro-bench-"));
    
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

  async runScenario(scenarioId, condition, runNumber) {
    const scenario = await this.loadScenario(scenarioId);
    const startTime = Date.now();
    
    const tmpDir = await this.setupFixture(scenario.fixture);
    
    const result = {
      benchmark: scenario.id,
      condition,
      run: runNumber,
      model: this.model,
      provider: this.provider,
      repoCommit: this.repoCommit,
      promptHash: this.calculatePromptHash(scenario.prompt),
      environment: this.getEnvironment(),
      usage: {
        inputTokens: null,
        outputTokens: null,
        cachedTokens: null,
        reasoningTokens: null,
        totalTokens: null,
        tokenSource: "unknown"
      },
      context: {
        chars: 0,
        bytes: 0
      },
      tools: {
        calls: 0,
        filesRead: 0,
        filesModified: 0
      },
      validation: {
        passed: false,
        testsPassed: 0,
        testsFailed: 0
      },
      metadata: {
        durationMs: 0,
        retries: 0,
        notes: ""
      }
    };

    try {
      const context = this.buildContext(scenario, condition);
      result.context.chars = context.length;
      result.context.bytes = Buffer.byteLength(context, "utf8");
      
      const validationResult = await this.validate(tmpDir, scenario.validation);
      result.validation = validationResult;
      
    } catch (error) {
      result.metadata.notes = `Error: ${error.message}`;
    } finally {
      result.metadata.durationMs = Date.now() - startTime;
      this.cleanup(tmpDir);
    }

    return result;
  }

  buildContext(scenario, condition) {
    let context = `Task: ${scenario.prompt}\n\n`;
    
    if (condition === "maestro-core" || condition === "maestro-memory") {
      context += `Rules: Follow Orquestrador Maestro rules.\n`;
      context += `Context: Use minimal sufficient context.\n`;
    }
    
    if (scenario.fixture && scenario.fixture.files) {
      for (const [filePath, content] of Object.entries(scenario.fixture.files)) {
        context += `\nFile: ${filePath}\n${content}\n`;
      }
    }
    
    return context;
  }

  async validate(projectDir, validation) {
    if (!validation || !validation.command) {
      return { passed: true, testsPassed: 0, testsFailed: 0 };
    }

    const { execSync } = require("node:child_process");
    
    try {
      execSync(validation.command, {
        cwd: projectDir,
        stdio: "pipe",
        timeout: 30000
      });
      return { passed: true, testsPassed: 1, testsFailed: 0 };
    } catch (error) {
      return { passed: false, testsPassed: 0, testsFailed: 1 };
    }
  }

  cleanup(tmpDir) {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (error) {
      console.error(`Warning: Failed to cleanup ${tmpDir}: ${error.message}`);
    }
  }

  saveResult(result) {
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }
    
    const filename = `${result.benchmark}_${result.condition}_run${result.run}.json`;
    const filepath = path.join(this.resultsDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(result, null, 2), "utf8");
    
    return filepath;
  }

  async runAll(scenarioIds, conditions, runsPerScenario = 3) {
    const results = [];
    
    for (const scenarioId of scenarioIds) {
      for (const condition of conditions) {
        for (let run = 1; run <= runsPerScenario; run++) {
          console.log(`Running ${scenarioId} - ${condition} - run ${run}`);
          const result = await this.runScenario(scenarioId, condition, run);
          this.saveResult(result);
          results.push(result);
        }
      }
    }
    
    return results;
  }

  generateReport(results) {
    const grouped = {};
    
    for (const result of results) {
      const key = `${result.benchmark}_${result.condition}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(result);
    }
    
    const report = {
      summary: {},
      details: grouped
    };
    
    for (const [key, runs] of Object.entries(grouped)) {
      const successfulRuns = runs.filter(r => r.validation.passed);
      const inputTokens = runs.map(r => r.usage.inputTokens).filter(t => t !== null);
      const durations = runs.map(r => r.metadata.durationMs);
      
      report.summary[key] = {
        totalRuns: runs.length,
        successfulRuns: successfulRuns.length,
        successRate: successfulRuns.length / runs.length,
        medianInputTokens: this.median(inputTokens),
        medianDuration: this.median(durations)
      };
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
  const runner = new BenchmarkRunner();
  const scenarios = runner.listScenarios();
  console.log("Available scenarios:", scenarios);
}

module.exports = { BenchmarkRunner };