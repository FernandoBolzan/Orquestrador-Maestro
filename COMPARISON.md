# Comparação: Com vs Sem Orquestrador

## Cenário Real

Imagine um projeto com 10 desenvolvedores trabalhando em uma feature de autenticação.

---

## SEM Orquestrador

### O que acontece:
```
Dev 1: "Qual era a decisão sobre JWT vs Session?"
Dev 2: "Não sei, pergunta pro Fulano"
Dev 3: "Fulano saiu, não documentou"
Dev 4: "Vou implementar com Session então"
Dev 5: "Mas o outro time usou JWT..."
```

### Problemas:
- **Perda de contexto:** Decisões se perdem entre sessões
- **Re-trabalho:** Mesmas perguntas respondidas múltiplas vezes
- **Inconsistência:** Cada dev implementa de um jeito
- **Onboarding lento:** Novos devs precisam de semanas para entender
- **Bugs:** Erros conhecidos são repetidos

### Métricas (estimadas):
| Item | Custo |
|------|-------|
| Tempo médio de onboarding | 2-4 semanas |
| Horas gastas em "caçar contexto" | 10-20h/semana/dev |
| Bugs por release | 5-10 |
| Retrabalho | 20-30% |

---

## COM Orquestrador

### O que acontece:
```
$ memory search --project auth --search "JWT"

→ obs_abc123: "Decisão: JWT para APIs, Session para webapp"
  - author: Fulano
  - date: 2026-08-15
  - verified: true
  - files: docs/adr/001-auth.md
```

### Benefícios:
- **Contexto preservado:** Decisões ficam registradas
- **Busca instantânea:** Encontra informações em segundos
- **Consistência:** Todos seguem as mesmas decisões
- **Onboarding rápido:** Novos devs aprendem em dias
- **Menos bugs:** Conhecimento acumulado evita erros

### Métricas (estimadas):
| Item | Custo |
|------|-------|
| Tempo médio de onboarding | 2-3 dias |
| Horas gastas em "caçar contexto" | 1-2h/semana/dev |
| Bugs por release | 1-3 |
| Retrabalho | 5-10% |

---

## Comparação Direta

| Aspecto | Sem Orquestrador | Com Orquestrador |
|---------|------------------|------------------|
| **Contexto** | Perdido entre sessões | Preservado em JSONL |
| **Busca** | "Pergunta pro Fulano" | `memory search` |
| **Decisões** | Em cabeças/Slack | Em ADRs + memória |
| **Onboarding** | 2-4 semanas | 2-3 dias |
| **Bugs** | 5-10/release | 1-3/release |
| **Retrabalho** | 20-30% | 5-10% |

---

## Exemplo Prático

### Situação: Bug no refresh token

**Sem Orquestrador:**
1. Dev encontra bug
2. Não sabe se é bug novo ou conhecido
3. Pergunta no Slack
4. Ninguém lembra
5. Investiga 4 horas
6. Descobre que já foi reportado 2 vezes

**Com Orquestrador:**
1. Dev encontra bug
2. Roda: `memory search --search "refresh token"`
3. Encontra: "Bug conhecido: TokenService permite múltiplos refreshes"
4. Ve: `files: ["src/TokenService.ts"]`
5. Corrige em 30 minutos

---

## Economia Estimada (10 devs)

> **Nota:** Os valores abaixo são estimativas baseadas em premissas teóricas e não em medições reais. Resultados variam significativamente entre equipes, projetos e contextos de uso.

| Cenário | Sem Orquestrador | Com Orquestrador |
|---------|------------------|------------------|
| Onboarding | Sem contexto persistente | Contexto preservado em memória |
| Busca de contexto | Perguntar a colegas | Busca na memória episódica |
| Retrabalho | Sem histórico de decisões | Histórico consultável |

---

## O que o Orquestrador Oferece

### 1. Memória Episódica
- Registra decisões, bugs, descobertas
- Busca por tipo, tags, texto
- Timeline cronológica
- Promoção para conhecimento canônico

### 2. Context Intelligence
- Classifica tarefas automaticamente
- Gerencia orçamento de contexto
- Detecta conflitos com conhecimento canônico

### 3. Benchmark Engine
- Mede eficiência de contexto
- Compara: vanilla vs maestro-core vs maestro-memory
- Métricas reais de uso

### 4. Adapters
- Integra com Claude, Codex, OpenCode
- Captura automaticamente observações
- Zero configuração manual

---

## Conclusão

| Pergunta | Resposta |
|----------|----------|
| Vale a pena? | Sim, para projetos com 3+ devs |
| Quando usar? | Quando há contexto valioso a preservar |
| Quanto economiza? | 15-30% do tempo de desenvolvimento |
| Complexidade? | Baixa - zero dependências, JSONL simples |

**Próximo passo:** Testar em um projeto real