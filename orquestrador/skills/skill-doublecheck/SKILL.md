---
name: skill-doublecheck
description: Verifica afirmações, fontes e risco de alucinação em respostas, pesquisas e documentos, com modo pontual ou contínuo.
category: verification
risk: medium
source: https://www.getclaudeskills.com/skills/doublecheck-github
---

# Skill Doublecheck

Use quando a pessoa disser “confira as fontes”, “isso está correto?”, “verifique essa resposta”, “faça uma checagem factual” ou “doublecheck”.

## Fluxo conversacional

1. Extraia as afirmações verificáveis do texto, código ou relatório recebido.
2. Separe fatos, inferências, opiniões e recomendações.
3. Classifique cada afirmação como verificada, plausível, disputada ou sem suporte.
4. Consulte fontes primárias e atuais quando o tema puder ter mudado; para assuntos de alto risco, aumente o rigor e destaque limites.
5. Apresente evidência, data e grau de confiança. Nunca invente citação nem diga que algo foi verificado sem fonte.

O padrão é uma checagem pontual. Só ative um modo contínuo se a pessoa pedir claramente algo como “verifique tudo nesta conversa”; nesse caso, confirme que ele está ativo e aceite “desative a verificação contínua”. Não transforme a conversa inteira em modo persistente silenciosamente.

## Guardrails

- Keep this skill compact; move long details into `references/` and link them from this file.
- Do not include tokens, local paths, logs, private project names, or stale API examples.
- Prefer project evidence over generic assumptions.

## Verification

- Confirm the requested behavior or decision is covered by local evidence.
- Run the relevant project validation gate when code, config, or operational behavior changes.

## Related Skills

- `skill-research-and-synthesis` para pesquisa comparável e rastreável.
- `skill-verification-before-completion` para comprovar que uma entrega realmente está pronta.
