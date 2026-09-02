# Benchmark Real - Resultados

## Data
2026-09-02

## Ambiente
- **OS:** Linux 6.17.0-23-generic
- **Node:** v22.17.0
- **Commit:** 693d734

## Metodologia

### Cenários (6)
1. **feature-add-button** - Criar componente Button
2. **bug-fix-auth** - Corrigir bug de refresh token
3. **investigate-performance** - Investigar problema de performance
4. **refactor-extract-util** - Extrair funções utilitárias
5. **resume-auth-feature** - Continuar feature de autenticação
6. **cross-session-migration** - Migração entre sessões

### Condições (3)
1. **vanilla** - Sem Maestro
2. **maestro-core** - Com regras e contexto do Maestro
3. **maestro-memory** - Com memória episódica

### Métricas
- Tamanho do contexto (chars/bytes)
- Duração de setup
- Validação do cenário

## Resultados por Cenário

### 1. feature-add-button

| Condição | Contexto | Duração |
|----------|----------|---------|
| vanilla | 385 chars | 3,285ms |
| maestro-core | 528 chars | 2,897ms |
| maestro-memory | 528 chars | 2,816ms |

**Análise:** Maestro adiciona 143 chars de overhead (regras + protocolo), mas reduz duração em 12%.

### 2. bug-fix-auth

| Condição | Contexto | Duração |
|----------|----------|---------|
| vanilla | 2,235 chars | 3,896ms |
| maestro-core | 2,378 chars | 3,624ms |
| maestro-memory | 2,378 chars | 3,757ms |

**Análise:** Maestro adiciona 143 chars de overhead, mas reduz duração em 7%.

### 3. investigate-performance

| Condição | Contexto | Duração |
|----------|----------|---------|
| vanilla | 1,140 chars | 3ms |
| maestro-core | 1,283 chars | 5ms |
| maestro-memory | 1,283 chars | 4ms |

**Análise:** Maestro adiciona 143 chars de overhead. Duração similar (setup only).

### 4. refactor-extract-util

| Condição | Contexto | Duração |
|----------|----------|---------|
| vanilla | 848 chars | 4ms |
| maestro-core | 991 chars | 6ms |
| maestro-memory | 991 chars | 5ms |

**Análise:** Maestro adiciona 143 chars de overhead. Duração similar (setup only).

### 5. resume-auth-feature

| Condição | Contexto | Duração |
|----------|----------|---------|
| vanilla | 1,419 chars | 3,527ms |
| maestro-core | 1,562 chars | 2,982ms |
| maestro-memory | 1,562 chars | 3,375ms |

**Análise:** Maestro adiciona 143 chars de overhead, mas reduz duração em 15%.

### 6. cross-session-migration

| Condição | Contexto | Duração |
|----------|----------|---------|
| vanilla | 1,429 chars | 7ms |
| maestro-core | 1,572 chars | 3ms |
| maestro-memory | 1,572 chars | 3ms |

**Análise:** Maestro adiciona 143 chars de overhead. Duração similar (setup only).

## Resumo Geral

### Tamanho do Contexto

| Condição | Média | Mínimo | Máximo |
|----------|-------|--------|--------|
| vanilla | 1,243 chars | 385 | 2,235 |
| maestro-core | 1,386 chars | 528 | 2,378 |
| maestro-memory | 1,386 chars | 528 | 2,378 |

**Overhead do Maestro:** +143 chars (11.5% em média)

### Duração

| Condição | Média | Mínimo | Máximo |
|----------|-------|--------|--------|
| vanilla | 1,787ms | 3ms | 3,896ms |
| maestro-core | 1,586ms | 3ms | 3,624ms |
| maestro-memory | 1,660ms | 3ms | 3,757ms |

**Economia do Maestro Core:** -201ms (11.3% mais rápido)
**Economia do Maestro Memory:** -127ms (7.1% mais rápido)

## Análise

### Positivos

1. **Overhead consistente:** Maestro adiciona ~143 chars em todos os cenários
2. **Setup mais rápido:** Maestro Core é 11.3% mais rápido em setup
3. **Memória não adiciona overhead significativo:** Maestro Memory é apenas 4.7% mais lento que Core

### Negativos

1. **Overhead de contexto:** +11.5% em tamanho de contexto
2. **Sem execução real:** Benchmarks medem apenas setup, não execução real com IA

### Limitações

1. **Sem modelo de IA:** Não mede tokens reais de entrada/saída
2. **Setup only:** Não inclui execução real das tarefas
3. **Amostra pequena:** 1 run por cenário/condição

## Claims Suportadas

✅ **"Maestro adiciona contexto estruturado"** - +143 chars por cenário
✅ **"Maestro Core reduz overhead de setup"** - 11.3% mais rápido
✅ **"Memória não impacta significativamente"** - Apenas 4.7% mais lento

❌ **NÃO suportado:** "Maestro reduz tokens em X%" - Requer execução real com IA
❌ **NÃO suportado:** "Maestro é Y vezes mais eficiente" - Requer benchmark completo

## Próximos Passos

1. **Execução real com IA:** Integrar com Claude/GPT-4 para medir tokens reais
2. **Múltiplos runs:** Executar 3+ runs por cenário/condição
3. **Métricas de tokens:** Coletar usage real da API do modelo
4. **Análise estatística:** Calcular p-values e intervalos de confiança

---

**Relatório completo:** `benchmarks/results/real/real-benchmark-report.json`