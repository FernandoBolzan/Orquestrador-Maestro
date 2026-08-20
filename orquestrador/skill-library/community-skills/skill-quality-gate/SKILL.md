---
name: skill-quality-gate
description: Avalia skills, plugins e MCPs antes da adoção, verificando formato, dependências, permissões, riscos de supply chain e critérios de validação.
category: governance
risk: high
source: orquestrador-native
---

# Skill Quality Gate

Use before copying or enabling any external skill, plugin, hook, or MCP.

## Procedure

1. Identify the source URL, commit/tag, license, maintainer, recent activity, and intended capabilities.
2. Read all `SKILL.md`, manifests, install scripts, hooks, and referenced scripts before execution.
3. Search for network calls, secret access, credential files, shell execution, destructive commands, telemetry, obfuscated code, and unrelated file writes.
4. Check whether the description matches the repository behavior.
5. Classify risk as `low`, `medium`, or `high`, and list required approvals.
6. Produce a decision: `accept`, `adapt`, `sandbox`, or `reject`.

## Required output

Include source, version, license, capabilities, permissions, risks, missing evidence, adaptation work, and a bounded verification plan.

Never install an external artifact merely because it has many stars. Popularity is discovery evidence, not security evidence.
