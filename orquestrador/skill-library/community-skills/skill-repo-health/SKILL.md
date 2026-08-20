---
name: skill-repo-health
description: Inspeciona um repositório e produz diagnóstico de stack, comandos de verificação, instruções, CI, riscos, documentação e próximos passos.
category: engineering
risk: medium
source: orquestrador-native
---

# Repository Health

Use at the beginning of substantial repository work.

## Inspect

- Locate project instructions, `DEV/`, package manifests, lockfiles, CI workflows, Docker files, migrations, tests, and deployment configuration.
- Detect language, framework, package manager, build, lint, typecheck, test, and migration commands from evidence.
- Check Git status without modifying it.
- Identify missing or conflicting instructions and stale documentation.
- Check obvious security and delivery risks without exploiting anything.

## Output

Return a compact report with stack, verification commands, architecture map, instruction sources, delivery risks, security risks, documentation gaps, confidence, and prioritized next actions.

Do not invent commands. Mark uncertain findings explicitly.
