#!/usr/bin/env node
"use strict";

const { BenchmarkRunner } = require("./runner.js");

function printHelp() {
  console.log(`Orquestrador Maestro Benchmark

Uso:
  node benchmark.js run [opções]
  node benchmark.js compare [opções]
  node benchmark.js report [opções]
  node benchmark.js list

Opções:
  --scenarios <ids>     comma-separated scenario IDs (default: all)
  --conditions <list>   comma-separated conditions: vanilla,maestro-core,maestro-memory
  --runs <n>            runs per scenario/condition (default: 3)
  --model <name>        AI model name
  --provider <name>     AI provider name
  --repo-commit <sha>   Git commit SHA
  --output <dir>        Results directory (default: ./results)
  --help                Show this help
`);
}

function parseArgs(argv) {
  const options = {
    command: "run",
    scenarios: [],
    conditions: ["vanilla", "maestro-core"],
    runs: 3,
    model: "unknown",
    provider: "unknown",
    repoCommit: "unknown",
    output: "./results"
  };

  const args = argv.slice(2);
  
  if (args[0] === "--help" || args[0] === "-h") {
    options.help = true;
    return options;
  }

  if (args[0]) {
    options.command = args[0];
  }

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === "--scenarios" && next) {
      options.scenarios = next.split(",");
      i++;
    } else if (arg === "--conditions" && next) {
      options.conditions = next.split(",");
      i++;
    } else if (arg === "--runs" && next) {
      options.runs = parseInt(next, 10);
      i++;
    } else if (arg === "--model" && next) {
      options.model = next;
      i++;
    } else if (arg === "--provider" && next) {
      options.provider = next;
      i++;
    } else if (arg === "--repo-commit" && next) {
      options.repoCommit = next;
      i++;
    } else if (arg === "--output" && next) {
      options.output = next;
      i++;
    }
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv);

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  const runner = new BenchmarkRunner({
    resultsDir: options.output,
    model: options.model,
    provider: options.provider,
    repoCommit: options.repoCommit
  });

  try {
    switch (options.command) {
      case "run": {
        const scenarios = options.scenarios.length > 0 
          ? options.scenarios 
          : runner.listScenarios();
        
        if (scenarios.length === 0) {
          console.error("No scenarios found");
          process.exit(1);
        }

        console.log(`Running ${scenarios.length} scenarios × ${options.conditions.length} conditions × ${options.runs} runs`);
        
        const results = await runner.runAll(scenarios, options.conditions, options.runs);
        
        const report = runner.generateReport(results);
        const reportPath = require("node:path").join(options.output, "report.json");
        require("node:fs").writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log(`\nBenchmark complete. ${results.length} runs executed.`);
        console.log(`Report saved to: ${reportPath}`);
        
        console.log("\nSummary:");
        for (const [key, summary] of Object.entries(report.summary)) {
          console.log(`  ${key}: ${summary.successfulRuns}/${summary.totalRuns} passed (median: ${summary.medianInputTokens || "N/A"} tokens)`);
        }
        break;
      }

      case "list": {
        const scenarios = runner.listScenarios();
        console.log("Available scenarios:");
        for (const id of scenarios) {
          const scenario = await runner.loadScenario(id);
          console.log(`  ${id}: ${scenario.name} (${scenario.type})`);
        }
        break;
      }

      case "compare": {
        console.log("Compare not yet implemented");
        break;
      }

      case "report": {
        console.log("Report not yet implemented");
        break;
      }

      default:
        console.error(`Unknown command: ${options.command}`);
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error("Benchmark error:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { parseArgs };