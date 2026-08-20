---
name: skill-threat-modeling
description: Conduz threat modeling estruturado com STRIDE-A, fluxos de dados, fronteiras de confiança, riscos priorizados e comparação incremental.
category: security
risk: high
source: https://github.com/awesome-copilot/threat-model-analyst
---

# Skill Threat Modeling

Use quando a pessoa pedir “faça um threat model”, “modele as ameaças”, “analise as fronteiras de confiança”, “aplique STRIDE” ou perguntar “o que pode dar errado de segurança?”.

## Fluxo conversacional

1. Confirme o alvo autorizado e se a análise é inicial ou incremental em relação a um baseline.
2. Mapeie ativos, atores, entradas, saídas, fluxos de dados e fronteiras de confiança.
3. Analise Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege e abuso de agentes quando aplicável.
4. Dê prioridade por impacto, probabilidade, exposição e facilidade de mitigação. Preste atenção especial a segredos, autenticação, autorização, PII, pagamentos e chamadas externas.
5. Entregue ameaças, evidências, mitigação proposta, responsável sugerido e plano de verificação; em modo incremental, destaque o que mudou.

O padrão é defensivo e somente leitura. Não explore alvos, não faça testes ativos e não altere o código sem um pedido separado e explícito.

## Guardrails

- Keep this skill compact; move long details into `references/` and link them from this file.
- Do not include tokens, local paths, logs, private project names, or stale API examples.
- Prefer project evidence over generic assumptions.

## Verification

- Confirm the requested behavior or decision is covered by local evidence.
- Run the relevant project validation gate when code, config, or operational behavior changes.

## Related Skills

- `skill-saas-security-scan` para uma varredura defensiva autorizada do repositório.
- `skill-supabase-rls` para políticas de acesso no Supabase/Postgres.
- `skill-incident-response` quando já houver um incidente em andamento.
