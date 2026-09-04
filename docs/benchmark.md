# Benchmark Methodology

This document describes the benchmark system in Orquestrador Maestro.

## Benchmark Types

### 1. Synthetic Benchmarks
- **Purpose**: Test renderer/aggregator functionality
- **Data**: Generated with `Math.random()`
- **Evidence Type**: `synthetic`
- **Public Claim Eligible**: `false`
- **Use**: Development and testing only

### 2. Infrastructure Benchmarks
- **Purpose**: Measure context measurement overhead
- **Data**: Real file operations, no AI calls
- **Evidence Type**: `infrastructure`
- **Public Claim Eligible**: `false`
- **Use**: Performance diagnostics

### 3. Provider API Smoke
- **Purpose**: Verify a real provider API call and its response contract
- **Data**: Real API calls with provider-reported tokens when available
- **Evidence Type**: `real-execution`
- **Reproducible**: `false` unless separately proven
- **Isolated**: `false` unless separately proven
- **Public Claim Eligible**: `false`
- **Use**: Provider connectivity and contract diagnostics

### 4. Future Real Maestro A/B/C Campaign
- **Status**: NOT EXECUTED
- **Purpose**: Compare the actual Maestro orchestration workflow under controlled conditions
- **Public quantitative claims**: NOT ALLOWED until that campaign is executed and evidenced

## Evidence Classification

| Evidence Type | Source | Trust Level | Public Claims |
|---------------|--------|-------------|---------------|
| `synthetic` | Generated data | None | Not allowed |
| `infrastructure` | Local measurements | Low | Not allowed |
| `provider-reported` | API response | High | Not allowed for product claims in provider smoke |
| `tokenizer-estimated` | Local tokenizer | Medium | Allowed with caveats |

## Provider Contract

### executeTask Function

```javascript
executeTask({
  model: "model-id",
  prompt: "task prompt",
  workingDirectory: "/path/to/project",
  condition: "vanilla|maestro-core|maestro-memory"
})
```

### Response Format

```json
{
  "success": true,
  "usage": {
    "inputTokens": 1234,
    "outputTokens": 567,
    "cachedTokens": 123,
    "reasoningTokens": null,
    "source": "provider-reported"
  },
  "duration": 4500,
  "acceptance": {
    "passed": true,
    "criteria": ["tests pass", "build succeeds"]
  }
}
```

## Conditions

### Vanilla
- No context management
- Raw prompt only
- Baseline comparison

### Maestro Core
- AGENTS.md rules applied
- Context brief generated
- Skill routing active

### Maestro Memory
- Scope-aware episodic memory
- Branch isolation
- Cross-session continuity

## Fairness Requirements

For valid comparisons:
- Same model
- Same scenario
- Same base commit
- Same environment
- Same acceptance criteria
- Same tool permissions

## Acceptance Gates

Each benchmark must define:
1. **Success criteria**: What constitutes completion
2. **Quality bar**: Minimum acceptable quality
3. **Time limit**: Maximum allowed duration
4. **Cost limit**: Maximum allowed token usage

## Running Benchmarks

### List available scenarios
```bash
orquestrador-maestro benchmark list
```

### Run a scenario
```bash
orquestrador-maestro benchmark run --scenario <id> --condition vanilla
```

### Real provider benchmark (requires API keys)
```bash
# Set environment variables
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...

# Run benchmark
node benchmarks/real-ai-benchmark.js
```

**Note**: `real-ai-benchmark.js` is a provider API smoke test. It calls a real provider and may collect provider-reported token counts, but it does not execute Maestro's actual orchestration workflow. Its `reproducible` and `isolated` evidence flags are `false`, and it is not eligible for product performance claims (`publicClaimEligible: false`). A real Maestro A/B/C campaign has NOT been executed.

## Public Claims

### Allowed (with evidence)
- "Maestro organizes context"
- "Maestro has scope-aware episodic memory"
- "Maestro prevents context leakage between branches"
- "Maestro supports work resumption via persistent memory"
- "Reproducible benchmark framework is available"

### Not Allowed (without data)
- "Saves X%"
- "X times faster"
- "R$ X savings"
- "Y% fewer bugs"

## Token Reporting

### Provider-Reported
- Direct from API response
- Most accurate
- Source: `provider-reported`

### Tokenizer-Estimated
- Local tokenization
- Approximate
- Source: `tokenizer-estimated`
- Must include disclaimer

## Benchmark Results

Results must include:
1. **Evidence executionType**: `synthetic` (fixture validation), `infrastructure` (setup/teardown), or `real-execution` (actual AI model call)
2. **Provider**: Which AI service was used
3. **Model**: Specific model ID
4. **Scenario**: What task was performed
5. **Conditions**: Vanilla vs Maestro
6. **Metrics**: Tokens, duration, acceptance
7. **Timestamp**: When the benchmark ran
8. **Commit**: Which code version was tested
9. **Token source**: `provider-reported` or `tokenizer-estimated`
10. **Reproducible**: Whether the result is reproducible; provider smoke reports `false`
11. **Isolated**: Whether the run was isolated from other runs; provider smoke reports `false`

## Marketing Guidelines

### Quantitative Claims
- Require provider-reported data
- Include sample size
- Include confidence interval
- Include comparison baseline
- Include timestamp

### Qualitative Claims
- Must be verifiable
- Must not exaggerate
- Must reflect actual behavior
- Must be current
