# Como rodar benchmark com API real

## 1. Configurar chaves de API

### Claude (Anthropic)

```bash
# Obter chave em: https://console.anthropic.com/settings/keys
export ANTHROPIC_API_KEY=sk-ant-api03-...
```

### OpenAI (GPT-4)

```bash
# Obter chave em: https://platform.openai.com/api-keys
export OPENAI_API_KEY=sk-...
```

### Salvar permanentemente

```bash
# Adicionar ao .bashrc ou .zshrc
echo 'export ANTHROPIC_API_KEY=sk-ant-api03-...' >> ~/.bashrc
echo 'export OPENAI_API_KEY=sk-...' >> ~/.bashrc
source ~/.bashrc
```

## 2. Rodar o benchmark

### Com Claude

```bash
cd /projetos/tools/Orquestrador-Maestro
node benchmarks/real-ai-benchmark.js --claude
```

### Com OpenAI

```bash
node benchmarks/real-ai-benchmark.js --openai
```

### Com ambos

```bash
node benchmarks/real-ai-benchmark.js --claude --openai
```

### Auto-detectar (usa o que estiver configurado)

```bash
node benchmarks/real-ai-benchmark.js
```

## 3. O que acontece

O script vai:

1. Carregar 6 cenários de teste
2. Para cada cenário, rodar 3 condições:
   - **vanilla:** Sem Maestro
   - **maestro-core:** Com regras do Maestro
   - **maestro-memory:** Com memória episódica
3. Medir tokens reais de entrada e saída
4. Gerar relatório comparativo

### Exemplo de saída

```
=== Real AI Benchmark ===

Providers: claude, openai
Scenarios: 6
Conditions: 3
Total runs: 36

--- CLAUDE ---

  feature-add-button:
    vanilla... 1234 input, 456 output, 2345ms
    maestro-core... 1180 input, 432 output, 2100ms
    maestro-memory... 1175 input, 428 output, 2050ms

  bug-fix-auth:
    vanilla... 2345 input, 567 output, 3456ms
    maestro-core... 2280 input, 543 output, 3200ms
    maestro-memory... 2275 input, 540 output, 3150ms

=== Resumo ===

CLAUDE:
  vanilla: 1890 input, 512 output, 2900ms
  maestro-core: 1830 input, 488 output, 2650ms
  maestro-memory: 1825 input, 484 output, 2600ms

Relatório salvo em: benchmarks/results/ai-real/ai-benchmark-report.json
```

## 4. Analisar resultados

### Ver relatório

```bash
cat benchmarks/results/ai-real/ai-benchmark-report.json | jq
```

### Calcular economia

```bash
# Script para calcular economia
node -e "
const report = require('./benchmarks/results/ai-real/ai-benchmark-report.json');
const claude = report.summary.claude;
const savings = ((claude.vanilla.avgInputTokens - claude['maestro-core'].avgInputTokens) / claude.vanilla.avgInputTokens * 100).toFixed(1);
console.log('Economia de tokens com Maestro:', savings + '%');
"
```

## 5. Custo estimado

### Claude 3.5 Sonnet

| Item | Preço |
|------|-------|
| Input | $3.00 / 1M tokens |
| Output | $15.00 / 1M tokens |
| Cache read | $0.30 / 1M tokens |

### GPT-4o

| Item | Preço |
|------|-------|
| Input | $2.50 / 1M tokens |
| Output | $10.00 / 1M tokens |
| Cache | $1.25 / 1M tokens |

### Exemplo de economia

**100 sessões/mês, 10 devs:**

| Provider | Sem Maestro | Com Maestro | Economia |
|----------|-------------|-------------|----------|
| Claude | $450/mês | $390/mês | $60/mês |
| GPT-4o | $375/mês | $330/mês | $45/mês |

## 6. Troubleshooting

### Erro: "ANTHROPIC_API_KEY não configurada"

```bash
echo $ANTHROPIC_API_KEY
# Se vazio, configure:
export ANTHROPIC_API_KEY=sua-chave-aqui
```

### Erro: "Rate limit"

O script já tem delay de 1s entre requests. Se persistir:

```bash
# Rodar menos cenários por vez
node benchmarks/real-ai-benchmark.js --claude 2>&1 | head -50
```

### Erro: "Model not found"

Verifique se sua conta tem acesso ao modelo:
- Claude: claude-3-5-sonnet-20241022
- OpenAI: gpt-4o

## 7. Alternativa: Usar CLI local

### Claude CLI

```bash
# Instalar Claude CLI
npm install -g @anthropic-ai/claude-cli

# Login
claude login

# Rodar prompt
echo "Tarefa: Criar componente Button" | claude
```

### OpenAI CLI

```bash
# Instalar OpenAI CLI
pip install openai

# Login
export OPENAI_API_KEY=sua-chave

# Rodar prompt
echo "Tarefa: Criar componente Button" | openai api chat.completions.create -m gpt-4o
```

## 8. Resultado esperado

Com Maestro, você deve ver:

1. **~10-15% menos tokens de input** (menos contexto enviado)
2. **~5-10% menos tokens de output** (respostas mais concisas)
3. **~10-20% mais rápido** (menos processamento)

Se não ver melhoria, verifique:
- Se o prompt do Maestro está sendo incluído corretamente
- Se os cenários são complexos o suficiente
- Se a IA está usando o contexto do Maestro