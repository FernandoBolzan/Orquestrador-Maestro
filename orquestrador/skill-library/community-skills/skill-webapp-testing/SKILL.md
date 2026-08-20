---
name: skill-webapp-testing
description: Testa aplicações web com Playwright ou ferramenta equivalente, cobrindo fluxos críticos, acessibilidade, estados de erro e regressões visuais.
category: testing
risk: medium
source: orquestrador-native
---

# Web App Testing

Use only against applications the user owns or is authorized to test.

## Workflow

1. Discover the app URL, startup command, test account policy, and allowed origins.
2. Map critical journeys and acceptance criteria.
3. Prefer semantic locators and accessibility state over brittle selectors.
4. Test happy path, validation errors, loading, empty, unauthorized, and failure states.
5. Capture screenshots, console errors, network failures, and trace artifacts when useful.
6. Clean up test data and avoid sending real messages or payments.
7. Report reproducible steps and artifacts.

Never bypass authorization or test third-party systems without explicit scope.
