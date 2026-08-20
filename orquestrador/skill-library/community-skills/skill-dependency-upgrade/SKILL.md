---
name: skill-dependency-upgrade
description: Atualiza dependências com changelog, compatibilidade, vulnerabilidades, lockfile, testes e plano de rollback.
category: maintenance
risk: medium
source: orquestrador-native
---

# Dependency Upgrade

Identify package manager and lockfile. Check current, target, peer, engine, license, security, and transitive impacts. Read official release notes for breaking changes. Update the smallest scope, run install, lint, typecheck, tests, build, and relevant smoke checks. Report unresolved advisories and do not suppress audit findings without justification.
