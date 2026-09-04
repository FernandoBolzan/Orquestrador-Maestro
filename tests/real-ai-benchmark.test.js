const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { RealAIBenchmark } = require("../benchmarks/real-ai-benchmark.js");

function scenario() {
  return { id: "fixture", prompt: "Answer briefly" };
}

function createBenchmark() {
  const scenariosDir = fs.mkdtempSync(path.join(os.tmpdir(), "provider-smoke-test-"));
  fs.writeFileSync(path.join(scenariosDir, "fixture.json"), JSON.stringify(scenario()));
  return { benchmark: new RealAIBenchmark({ scenariosDir }), scenariosDir };
}

test("provider API smoke success uses the exact model and conservative evidence", async () => {
  const { benchmark, scenariosDir } = createBenchmark();
  benchmark.callClaude = async () => ({
    content: "ok",
    usage: { input_tokens: 11, output_tokens: 7, cache_read_input_tokens: 2 }
  });

  const result = await benchmark.runScenario("fixture", "vanilla", "claude");
  fs.rmSync(scenariosDir, { recursive: true, force: true });

  assert.equal(result.resultType, "provider-api-smoke");
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.model, "claude-3-5-sonnet-20241022");
  assert.equal(result.evidence.executionType, "real-execution");
  assert.equal(result.evidence.publicClaimEligible, false);
  assert.equal(result.evidence.reproducible, false);
  assert.equal(result.evidence.isolated, false);
  assert.equal(result.usage.tokenSource, "provider-reported");
  assert.equal(result.error, null);
});

test("provider API smoke failure preserves the same contract", async () => {
  const { benchmark, scenariosDir } = createBenchmark();
  benchmark.callOpenAI = async () => {
    throw new Error("provider failure");
  };

  const result = await benchmark.runScenario("fixture", "maestro-core", "openai");
  fs.rmSync(scenariosDir, { recursive: true, force: true });

  assert.equal(result.resultType, "provider-api-smoke");
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.model, "gpt-4o");
  assert.equal(result.usage, null);
  assert.match(result.error, /provider failure/);
  assert.equal(result.evidence.executionType, "real-execution");
  assert.equal(result.evidence.publicClaimEligible, false);
  assert.equal(result.evidence.reproducible, false);
  assert.equal(result.evidence.isolated, false);
});
