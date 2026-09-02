# Architecture Assessment - Orquestrador Maestro

## Date
2026-09-02

## Current State

### Core Components
1. **CLI** (`bin/orquestrador-maestro.js`) - Node.js CLI with commands: install, update, verify, doctor, init-dev, compact-worklog, check-dev-gates, context brief, adapters, workflow-lock, workflow-state, changelog, telemetry, version
2. **Orquestrador Core** (`orquestrador/`) - Rules, maestro protocol, persistence contract, hooks, skill router, execution profiles
3. **Skills System** - SKILLS_ROUTER.json, SKILL_EXECUTION_PROFILES.json, SKILL_ALIASES.json, SKILL_CHAINS.json
4. **DEV/ Convention** - Operational memory via files: README.md, HANDOFF.md, CONTEXT.md, SPECS/ACTIVE.md, VERIFY.md, WORKLOG.md
5. **Context Brief** (`orquestrador/bin/context-brief.js`) - Generates bounded context for tasks
6. **Tool Profiles** (`tool-profiles/`) - Entrypoints for various AI tools

### What Exists
- Skill routing and execution profiles
- Context brief generation
- DEV/ file-based operational memory
- Workflow lock and state management
- Multi-tool integration (Codex, Claude, OpenCode, Cursor, Gemini, etc.)
- Telemetry (disabled by default)
- Installation and update system

### What Does NOT Exist (per Master Prompt)
1. **Episodic Memory** - No persistent observations across sessions
2. **Benchmark Engine** - No systematic performance measurement
3. **Context Budget** - No explicit token budget management per source
4. **Task Classification** - No trivial/bounded/complex/resumed/investigation classification
5. **Memory Search** - No search over historical observations
6. **Memory Promotion** - No mechanism to promote observations to canonical knowledge
7. **Redaction Policy** - No systematic secret/PII exclusion
8. **Project Identity** - No robust project identification beyond folder name
9. **Retention Policy** - No pruning/archival of old data
10. **Observation Schema** - No structured observation format

## Divergences from Master Prompt

### 1. Memory Architecture
**Master Prompt:** Episodic memory with observations, search, timeline, promotion
**Current State:** Only DEV/ file-based context
**Gap:** Large - requires new subsystem

### 2. Benchmark Engine
**Master Prompt:** Systematic benchmark with scenarios, conditions, runs, statistical analysis
**Current State:** No benchmark capability
**Gap:** Large - requires new subsystem

### 3. Context Intelligence
**Master Prompt:** Task classification, context budget, episodic search integration
**Current State:** Basic context brief without budget or memory integration
**Gap:** Medium - extends existing context brief

### 4. Security
**Master Prompt:** Redaction, prompt injection defense, privacy
**Current State:** Basic privacy (telemetry disabled), no redaction
**Gap:** Medium - requires new security layer

### 5. Project Identity
**Master Prompt:** Robust identification using git remote, repository root, hash
**Current State:** Likely folder-based
**Gap:** Small - can be added

## Recommendations

### Phase 0 Tasks (Discovery)
1. ✅ Analyze Maestro current state
2. ✅ Analyze claude-mem inspiration
3. ✅ Verify licenses (Maestro: unclear, claude-mem: Apache-2.0)
4. ✅ Map architecture
5. ✅ Identify divergences
6. Register decisions in ADR

### Proposed Architecture Evolution

```text
Current:
Intent → Context Brief → Skill Router → Execution → Verification → DEV/ Files

Future:
Intent → Task Classification → Context Planner → Canonical Context + Episodic Search → Context Budget → Context Brief → Skill Router → Execution → Verification → Observation Capture → Episodic Memory → Optional Promotion
```

### Key Design Decisions Needed
1. Observation schema (types, fields, versioning)
2. Project identity strategy (git remote + path + hash)
3. Storage format (JSONL → SQLite evolution)
4. Search algorithm (lexical → semantic evolution)
5. Context budget allocation
6. Task classification heuristic
7. Redaction rules
8. Retention policy

## Risks
1. **Complexity** - Adding memory and benchmark increases system complexity
2. **Dependencies** - Must keep zero/low dependency principle
3. **Cross-platform** - Must work on Windows/Linux/macOS
4. **Backward compatibility** - Must not break existing workflows
5. **Performance** - Memory search must be fast for normal development

## Next Steps
1. Create ADR for episodic memory
2. Design observation schema
3. Design project identity
4. Design context budget
5. Implement Phase 1: Episodic Memory Core