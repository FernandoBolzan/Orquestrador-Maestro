---
name: skill-skill-development
description: Cria, revisa e melhora skills do Orquestrador com gatilhos claros, divulgação progressiva, referências focadas, validação e testes de comportamento.
category: governance
risk: medium
source: https://github.com/anthropics/claude-plugins-official/tree/main/plugins/skill-development
---

# Skill Skill Development

Use quando a pessoa pedir “crie uma skill”, “melhore uma skill”, “avalie o gatilho”, “organize o SKILL.md” ou “quero publicar uma skill”.

## Fluxo conversacional

1. Converta a ideia em casos de uso concretos, entradas, saídas e frases que uma pessoa realmente diria.
2. Inspecione o catálogo, router, aliases, manifest e cadeias existentes antes de criar algo paralelo.
3. Mantenha o `SKILL.md` focado, com divulgação progressiva: regras essenciais primeiro e referências somente quando necessárias.
4. Defina limites, conflitos de roteamento, permissões, dependências e comportamento de falha.
5. Valide frontmatter, nome, UTF-8, ausência de caminhos privados/segredos, gatilhos sem ambiguidade e roteamento por exemplos reais.
6. Rode os gates do repositório e registre a origem/licença quando a skill for adaptada de terceiros.

Use as ferramentas locais de criação e quality gate quando fizer sentido. Não instale artefatos externos automaticamente; primeiro avalie formato, escopo, dependências, permissões e risco.

## Guardrails

- Keep this skill compact; move long details into `references/` and link them from this file.
- Do not include tokens, local paths, logs, private project names, or stale API examples.
- Prefer project evidence over generic assumptions.

## Verification

- Confirm the requested behavior or decision is covered by local evidence.
- Run the relevant project validation gate when code, config, or operational behavior changes.

## Related Skills

- `skill-creator` para o formato e a estrutura base de uma skill.
- `skill-quality-gate` para avaliar uma skill, plugin ou MCP antes da adoção.
- `skill-verification-before-completion` para comprovar o comportamento do catálogo após a alteração.
