---
name: skill-preflight
description: Define constraints, failure modes, ownership, baseline verification, and minimal test plan before implementation.
category: workflow
risk: medium
source: orquestrador-native
---

# Preflight

Use before editing code or configuration for non-trivial work.

## Required checks

1. Restate the requested outcome and boundaries.
2. Identify affected files, data, APIs, users, and external systems.
3. Record the clean baseline: build, lint, typecheck, and tests when available.
4. List assumptions and failure modes.
5. Define file/module ownership for parallel agents.
6. Define the smallest meaningful verification plan.
7. Flag destructive, production, secret, auth, payment, migration, or customer-data operations for explicit confirmation.

Finish with a go/no-go decision and the next safe action.
