#!/usr/bin/env node
"use strict";

// This is a provider API smoke benchmark.
// It does not execute the Maestro product workflow.
// It is not eligible for product performance claims.
// publicClaimEligible: false

const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");
const http = require("node:http");

class RealAIBenchmark {
  constructor(options = {}) {
    this.scenariosDir = options.scenariosDir || path.join(__dirname, "scenarios");
    this.resultsDir = options.resultsDir || path.join(__dirname, "results", "ai-real");
    this.anthropicKey = process.env.ANTHROPIC_API_KEY;
    this.openaiKey = process.env.OPENAI_API_KEY;
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

  async callClaude(prompt, maxTokens = 1024) {
    if (!this.anthropicKey) {
      throw new Error("ANTHROPIC_API_KEY não configurada");
    }

    const data = JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }]
    });

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: "api.anthropic.com",
        path: "/v1/messages",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.anthropicKey,
          "anthropic-version": "2023-06-01"
        }
      }, (res) => {
        let body = "";
        res.on("data", chunk => body += chunk);
        res.on("end", () => {
          try {
            const result = JSON.parse(body);
            if (result.error) {
              reject(new Error(result.error.message));
            } else {
              resolve({
                content: result.content[0].text,
                usage: result.usage
              });
            }
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on("error", reject);
      req.write(data);
      req.end();
    });
  }

  async callOpenAI(prompt, maxTokens = 1024) {
    if (!this.openaiKey) {
      throw new Error("OPENAI_API_KEY não configurada");
    }

    const data = JSON.stringify({
      model: "gpt-4o",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }]
    });

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: "api.openai.com",
        path: "/v1/chat/completions",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.openaiKey}`
        }
      }, (res) => {
        let body = "";
        res.on("data", chunk => body += chunk);
        res.on("end", () => {
          try {
            const result = JSON.parse(body);
            if (result.error) {
              reject(new Error(result.error.message));
            } else {
              resolve({
                content: result.choices[0].message.content,
                usage: result.usage
              });
            }
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on("error", reject);
      req.write(data);
      req.end();
    });
  }

  buildPrompt(scenario, withMaestro = false) {
    let prompt = `Tarefa: ${scenario.prompt}\n\n`;

    if (scenario.fixture && scenario.fixture.files) {
      prompt += "Arquivos do projeto:\n";
      for (const [filePath, content] of Object.entries(scenario.fixture.files)) {
        const contentStr = typeof content === "object" ? JSON.stringify(content, null, 2) : content;
        prompt += `\n--- ${filePath} ---\n${contentStr}\n`;
      }
    }

    if (withMaestro) {
      prompt = `Você é um assistente de IA usando o Orquestrador Maestro.

Regras:
- Use o menor contexto suficiente
- Verifique o resultado antes de entregar
- Não faça commit sem autorização

Fluxo: Observe → Roteie → Selecione → Aja → Verifique → Reporte

${prompt}`;
    }

    return prompt;
  }

  async runScenario(scenarioId, condition, provider) {
    const scenario = this.loadScenario(scenarioId);
    const withMaestro = condition !== "vanilla";
    const prompt = this.buildPrompt(scenario, withMaestro);

    const startTime = Date.now();
    let result;

    try {
      if (provider === "claude") {
        result = await this.callClaude(prompt);
      } else if (provider === "openai") {
        result = await this.callOpenAI(prompt);
      } else {
        throw new Error(`Provider desconhecido: ${provider}`);
      }
    } catch (error) {
      return {
        benchmark: scenario.id,
        condition,
        provider,
        error: error.message,
        durationMs: Date.now() - startTime
      };
    }

    const duration = Date.now() - startTime;

    return {
      benchmark: scenario.id,
      condition,
      provider,
      model: provider === "claude" ? "claude-3-5-sonnet" : "gpt-4o",
      promptHash: require("node:crypto").createHash("sha256").update(prompt).digest("hex"),
      usage: {
        inputTokens: result.usage.input_tokens || result.usage.prompt_tokens,
        outputTokens: result.usage.output_tokens || result.usage.completion_tokens,
        cachedTokens: result.usage.cache_read_input_tokens || 0,
        totalTokens: (result.usage.input_tokens || result.usage.prompt_tokens) +
                     (result.usage.output_tokens || result.usage.completion_tokens),
        tokenSource: "provider-reported"
      },
      evidence: {
        executionType: "real-execution",
        publicClaimEligible: false,
        reproducible: true,
        isolated: true
      },
      content: result.content.substring(0, 500) + "...",
      durationMs: duration,
      timestamp: new Date().toISOString()
    };
  }

  async runAll(providers = ["claude", "openai"]) {
    const scenarios = this.listScenarios();
    const conditions = ["vanilla", "maestro-core", "maestro-memory"];
    const results = [];

    console.log("=== Real AI Benchmark ===\n");
    console.log(`Providers: ${providers.join(", ")}`);
    console.log(`Scenarios: ${scenarios.length}`);
    console.log(`Conditions: ${conditions.length}`);
    console.log(`Total runs: ${scenarios.length * conditions.length * providers.length}\n`);

    for (const provider of providers) {
      console.log(`\n--- ${provider.toUpperCase()} ---`);

      for (const scenarioId of scenarios) {
        console.log(`\n  ${scenarioId}:`);

        for (const condition of conditions) {
          process.stdout.write(`    ${condition}... `);

          try {
            const result = await this.runScenario(scenarioId, condition, provider);
            this.saveResult(result);
            results.push(result);

            if (result.error) {
              console.log(`ERRO: ${result.error}`);
            } else {
              console.log(`${result.usage.inputTokens} input, ${result.usage.outputTokens} output, ${result.durationMs}ms`);
            }
          } catch (error) {
            console.log(`ERRO: ${error.message}`);
          }

          // Rate limit: 1 request per second
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }

    return results;
  }

  saveResult(result) {
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }

    const filename = `${result.benchmark}_${result.condition}_${result.provider}.json`;
    const filepath = path.join(this.resultsDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(result, null, 2), "utf8");

    return filepath;
  }

  generateReport(results) {
    const report = {
      metadata: {
        timestamp: new Date().toISOString(),
        totalRuns: results.length,
        successfulRuns: results.filter(r => !r.error).length,
        failedRuns: results.filter(r => r.error).length
      },
      byProvider: {},
      byCondition: {},
      summary: {}
    };

    // Agrupar por provider
    for (const result of results) {
      if (!report.byProvider[result.provider]) {
        report.byProvider[result.provider] = [];
      }
      report.byProvider[result.provider].push(result);
    }

    // Agrupar por condição
    for (const result of results) {
      if (!report.byCondition[result.condition]) {
        report.byCondition[result.condition] = [];
      }
      report.byCondition[result.condition].push(result);
    }

    // Calcular médias por provider e condição
    for (const [provider, runs] of Object.entries(report.byProvider)) {
      report.summary[provider] = {};

      for (const condition of ["vanilla", "maestro-core", "maestro-memory"]) {
        const conditionRuns = runs.filter(r => r.condition === condition && !r.error);

        if (conditionRuns.length > 0) {
          const avgInput = conditionRuns.reduce((sum, r) => sum + r.usage.inputTokens, 0) / conditionRuns.length;
          const avgOutput = conditionRuns.reduce((sum, r) => sum + r.usage.outputTokens, 0) / conditionRuns.length;
          const avgDuration = conditionRuns.reduce((sum, r) => sum + r.durationMs, 0) / conditionRuns.length;

          report.summary[provider][condition] = {
            runs: conditionRuns.length,
            avgInputTokens: Math.round(avgInput),
            avgOutputTokens: Math.round(avgOutput),
            avgDurationMs: Math.round(avgDuration)
          };
        }
      }
    }

    return report;
  }
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const providers = [];

  if (args.includes("--claude")) providers.push("claude");
  if (args.includes("--openai")) providers.push("openai");

  if (providers.length === 0) {
    if (process.env.ANTHROPIC_API_KEY) providers.push("claude");
    if (process.env.OPENAI_API_KEY) providers.push("openai");
  }

  if (providers.length === 0) {
    console.log("Uso: node real-ai-benchmark.js [--claude] [--openai]");
    console.log("\nConfigure as variáveis de ambiente:");
    console.log("  export ANTHROPIC_API_KEY=sua-chave");
    console.log("  export OPENAI_API_KEY=sua-chave");
    process.exit(1);
  }

  const benchmark = new RealAIBenchmark();

  benchmark.runAll(providers).then(results => {
    const report = benchmark.generateReport(results);
    const reportPath = path.join(benchmark.resultsDir, "ai-benchmark-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log("\n=== Resumo ===\n");

    for (const [provider, conditions] of Object.entries(report.summary)) {
      console.log(`\n${provider.toUpperCase()}:`);

      for (const [condition, stats] of Object.entries(conditions)) {
        console.log(`  ${condition}: ${stats.avgInputTokens} input, ${stats.avgOutputTokens} output, ${stats.avgDurationMs}ms`);
      }
    }

    console.log(`\nRelatório salvo em: ${reportPath}`);
  }).catch(error => {
    console.error("Erro:", error);
    process.exit(1);
  });
}

module.exports = { RealAIBenchmark };