#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { BenchmarkRunner } = require("./runner.js");

async function runBenchmarkV1() {
  const runner = new BenchmarkRunner({
    resultsDir: path.join(__dirname, "results"),
    model: "simulated",
    provider: "simulated",
    repoCommit: "c25ce190283f1b860a866f86f96230ad915f268a"
  });

  console.log("=== Benchmark V1 - Simulated Run ===\n");

  const scenarios = runner.listScenarios();
  console.log(`Found ${scenarios.length} scenarios\n`);

  const conditions = ["vanilla", "maestro-core", "maestro-memory"];
  const runsPerScenario = 3;

  console.log(`Running ${scenarios.length} scenarios × ${conditions.length} conditions × ${runsPerScenario} runs\n`);

  const results = [];

  for (const scenarioId of scenarios) {
    console.log(`\n--- Scenario: ${scenarioId} ---`);
    
    for (const condition of conditions) {
      console.log(`  Condition: ${condition}`);
      
      for (let run = 1; run <= runsPerScenario; run++) {
        process.stdout.write(`    Run ${run}... `);
        
        const result = await runner.runScenario(scenarioId, condition, run);
        
        result.usage = {
          inputTokens: Math.floor(Math.random() * 5000) + 1000,
          outputTokens: Math.floor(Math.random() * 2000) + 500,
          cachedTokens: condition === "maestro-memory" ? Math.floor(Math.random() * 1000) : 0,
          reasoningTokens: null,
          totalTokens: null,
          tokenSource: "simulated"
        };
        result.usage.totalTokens = result.usage.inputTokens + result.usage.outputTokens;
        
        result.tools = {
          calls: Math.floor(Math.random() * 20) + 5,
          filesRead: Math.floor(Math.random() * 10) + 2,
          filesModified: Math.floor(Math.random() * 5) + 1
        };
        
        runner.saveResult(result);
        results.push(result);
        
        console.log(`done (${result.metadata.durationMs}ms, ${result.usage.totalTokens} tokens)`);
      }
    }
  }

  console.log("\n=== Generating Report ===\n");

  const report = runner.generateReport(results);
  
  const reportPath = path.join(__dirname, "results", "benchmark-v1-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log("Summary:");
  for (const [key, summary] of Object.entries(report.summary)) {
    console.log(`  ${key}:`);
    console.log(`    Runs: ${summary.totalRuns}`);
    console.log(`    Successful: ${summary.successfulRuns}`);
    console.log(`    Success Rate: ${(summary.successRate * 100).toFixed(1)}%`);
    console.log(`    Median Tokens: ${summary.medianInputTokens || "N/A"}`);
    console.log(`    Median Duration: ${summary.medianDuration || "N/A"}ms`);
  }

  console.log(`\nFull report saved to: ${reportPath}`);
  
  return report;
}

if (require.main === module) {
  runBenchmarkV1().catch(console.error);
}

module.exports = { runBenchmarkV1 };