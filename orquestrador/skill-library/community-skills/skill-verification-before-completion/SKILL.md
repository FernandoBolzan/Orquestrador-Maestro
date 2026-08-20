---
name: skill-verification-before-completion
description: Garante que uma tarefa só seja declarada concluída após evidência proporcional, cobrindo comportamento, qualidade e documentação.
category: quality
risk: low
source: orquestrador-native
---

# Verification Before Completion

Before claiming completion, compare the requested acceptance criteria against evidence.

Run the lightest meaningful checks first, then build, lint, typecheck, tests, integration checks, visual checks, or security checks as applicable. Verify changed paths and user-visible behavior, not only compilation. Report commands, outcomes, skipped checks, and residual risks. If verification is unavailable, say exactly why and downgrade the completion claim.
