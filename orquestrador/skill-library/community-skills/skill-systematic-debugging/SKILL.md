---
name: skill-systematic-debugging
description: Investiga bugs por evidência, reproduz o problema, rastreia a causa raiz e verifica a correção sem mascarar sintomas.
category: engineering
risk: medium
source: orquestrador-native
---

# Systematic Debugging

Follow this loop:

1. Reproduce the failure with the smallest reliable case.
2. Capture exact inputs, environment, expected result, actual result, and first failing boundary.
3. Form competing hypotheses and rank them by evidence.
4. Instrument or inspect the narrowest boundary that distinguishes them.
5. Trace the root cause backward through data, control flow, and configuration.
6. Implement the smallest fix that addresses the cause.
7. Add a regression test.
8. Verify the original failure, adjacent behavior, and relevant quality gates.

Do not broaden the fix or declare success from a single passing retry.
