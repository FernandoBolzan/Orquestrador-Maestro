# ADR-001: Episodic Memory for Orquestrador Maestro

## Status
Proposed

## Date
2026-09-02

## Context

The Orquestrador Maestro currently relies on DEV/ file-based operational memory for cross-session continuity. While effective for current workflows, this approach has limitations:

1. **No historical observations** - Only current state is preserved, not the journey
2. **No search over past decisions** - Cannot query "when did we decide X?"
3. **No context from past failures** - Cannot learn from previous debugging sessions
4. **No systematic benchmark** - Cannot measure token efficiency or improvement

The Master Prompt proposes adding episodic memory to capture observations across sessions, integrate with context brief, and enable systematic benchmarking.

## Decision

Implement episodic memory as a JSONL-based subsystem with the following characteristics:

### 1. Observation Schema
```json
{
  "schemaVersion": 1,
  "id": "obs_...",
  "timestamp": "...",
  "project": "...",
  "taskId": "...",
  "type": "discovery|decision|problem|attempt|failure|implementation|verification|risk|dependency|environment|workaround",
  "summary": "...",
  "details": "...",
  "files": [],
  "tags": [],
  "verified": false,
  "source": {}
}
```

### 2. Storage
- Location: `~/.orquestrador/memory/projects/<project-id>/observations.jsonl`
- Format: JSONL (one observation per line)
- Project identity: combination of git remote + normalized path + hash

### 3. Search
- Initial: lexical search on summary, tags, files, type, recency
- Future: FTS → semantic search if benchmarks show need

### 4. Integration with Context Brief
- Task classification determines if memory search is triggered
- Context budget allocates space for episodic context
- Observations retrieved by relevance to current task

### 5. Redaction
- Automatic exclusion of secrets, API keys, paths, PII
- `<private>` tag support for manual exclusion

## Alternatives

### Alternative 1: File-based observations in DEV/
**Pros:** Simple, version-controlled, human-readable
**Cons:** No search, no structured queries, bloats repository

### Alternative 2: SQLite database
**Pros:** ACID, SQL queries, FTS5 support
**Cons:** Adds dependency, more complex, requires migration

### Alternative 3: Chroma/vector DB
**Pros:** Semantic search, embeddings
**Cons:** Heavy dependency, premature, requires Python/uv

## Trade-offs

### Chose JSONL because:
1. Zero dependencies (Node.js fs only)
2. Simple append-only writes
3. Human-readable and debuggable
4. Can evolve to SQLite later if needed
5. Fits Maestro's "zero-dependency principle"

### Deferred SQLite/FTS because:
1. Premature optimization for initial implementation
2. Adds dependency and complexity
3. Can be added later when volume justifies

### Deferred semantic search because:
1. Requires embeddings model (cost, dependency)
2. Lexical search may be sufficient for structured observations
3. Benchmarks should determine if semantic is needed

## Consequences

### Positive
1. Cross-session continuity through observations
2. Searchable historical context
3. Foundation for benchmark engine
4. Context economy through relevance-based retrieval

### Negative
1. Adds complexity to context brief
2. Requires project identity strategy
3. Storage growth over time (mitigated by retention policy)
4. Potential for stale observations to influence decisions

### Risks
1. Memory could become stale or conflicting
   - Mitigation: Hierarchy of authority (canonical > episodic)
2. Memory could be corrupted
   - Mitigation: Schema validation, graceful degradation
3. Memory could leak secrets
   - Mitigation: Redaction policy, testing

## Revisit Conditions

1. If lexical search proves insufficient for retrieval quality
2. If observation volume exceeds 10,000 per project
3. If benchmarks show memory adds more overhead than value
4. If semantic search becomes necessary for context relevance

## References

- Master Prompt sections 19-37 (Episodic Memory)
- claude-mem architecture (inspiration, not direct copy)
- Current Maestro: orquestrador/bin/context-brief.js