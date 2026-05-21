# Orquestrador Maestro

Kit público e sanitizado para instalar uma hierarquia de orquestração de IAs multiplataforma (Windows, Linux e macOS), com regras globais, Codex skills, hooks, roteamento de skills, perfis de ferramentas e memória operacional de projetos em `DEV/`.

Repositório: [github.com/FernandoBolzan/Orquestrador-Maestro](https://github.com/FernandoBolzan/Orquestrador-Maestro)

## Iniciativa Grupo IAPro

O Orquestrador Maestro é uma iniciativa do Grupo IAPro, uma comunidade de WhatsApp e Discord para quem está construindo, estudando e aplicando IA no trabalho real: automações, agentes, desenvolvimento, produto, operações e novos fluxos com ferramentas de IA.

Participe da comunidade pelo link:

[fernandobolzan.com/bio](https://www.fernandobolzan.com/bio)

A proposta do projeto é compartilhar uma base prática e instalável para que mais pessoas consigam configurar suas IAs com hierarquia, skills, hooks, documentação local e boas práticas de segurança, sem depender de uma configuração privada de uma máquina específica.

## Visão Geral

O Orquestrador Maestro é uma camada portátil de instruções para fazer várias IAs trabalharem com o mesmo contrato operacional no computador do usuário (Windows, Linux ou macOS). Ele não é uma IA nova, nem substitui Codex, Claude Code, OpenCode, Cursor, Gemini CLI ou Windsurf. Ele instala arquivos que essas ferramentas conseguem ler para padronizar:

- onde a IA busca regras;
- como ela identifica o papel do usuário como Maestro;
- como escolhe skills sem carregar contexto demais;
- quando deve usar hooks, verificação, docs locais e agentes auxiliares;
- onde registra memória curta do projeto para economizar tokens;
- quais arquivos nunca devem ser publicados.

A ideia prática é simples: a pessoa baixa este repositório, executa o instalador e recebe a mesma estrutura base no próprio home do usuário (`%USERPROFILE%` no Windows ou `$HOME` no Linux/macOS), com placeholders trocados para o usuário dela. O pacote foi preparado para publicação, então não deve conter tokens, logs, caches, memórias locais, backups ou caminhos reais da máquina fonte.

## Para Quem Serve

Este repositório é útil para quem quer:

- configurar um ambiente de IA local com regras consistentes;
- compartilhar uma base de skills e hooks sem expor dados pessoais;
- usar Codex, Claude Code, OpenCode, Cursor, Gemini CLI e Windsurf com a mesma hierarquia;
- fazer agentes lerem a pasta `DEV/` dos projetos antes de gastar tokens em exploração longa;
- manter um padrão repetível de instalação em qualquer usuário Windows, Linux ou macOS;
- evoluir skills localmente e depois publicar um snapshot sanitizado.

## Download

Clone com Git:

```bash
git clone https://github.com/FernandoBolzan/Orquestrador-Maestro.git
cd Orquestrador-Maestro
```

Download em ZIP:

[Baixar ZIP da branch main](https://github.com/FernandoBolzan/Orquestrador-Maestro/archive/refs/heads/main.zip)

Se baixar como ZIP, extraia a pasta antes de executar os comandos abaixo.

## Instalação Rápida

### Windows (PowerShell)
Abra o PowerShell dentro da pasta do repositório e rode:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

Depois verifique:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-install.ps1
```

### Linux / macOS (Bash)
Abra o terminal dentro da pasta do repositório e rode:

```bash
chmod +x install.sh
./install.sh
```

Depois verifique:

```bash
./scripts/verify-install.sh
```

Se a verificação passar, as ferramentas instaladas já passam a ter pontos de entrada globais apontando para o Orquestrador Maestro.

## Instalação Guiada Por IA

Você também pode pedir para uma IA instalar o pacote. Use um pedido assim:

**Para Windows:**
```text
Baixe ou clone https://github.com/FernandoBolzan/Orquestrador-Maestro,
execute install.ps1 no PowerShell, rode scripts/verify-install.ps1
e confirme que o Orquestrador Maestro foi instalado no meu %USERPROFILE%.
Não exponha tokens, logs, caches, arquivos privados ou caminhos de outra máquina.
```

**Para Linux/macOS:**
```text
Baixe ou clone https://github.com/FernandoBolzan/Orquestrador-Maestro,
execute install.sh no terminal, rode scripts/verify-install.sh
e confirme que o Orquestrador Maestro foi instalado no meu $HOME.
Não exponha tokens, logs, caches, arquivos privados ou caminhos de outra máquina.
```

A IA deve usar o usuário atual da máquina dela. Ela não deve copiar caminhos absolutos de outra pessoa.

## O Que A Instalação Cria

Por padrão, o instalador copia o núcleo, skills, agentes, prompts e perfis de ferramentas para o home do usuário atual.

| Destino (Win) | Destino (Unix) | Função |
|---|---|---|
| `%USERPROFILE%\.orquestrador` | `$HOME/.orquestrador` | Núcleo canônico com regras, Maestro, hooks, roteadores, índices, scripts e skills principais. |
| `%USERPROFILE%\AGENTS.md` | `$HOME/AGENTS.md` | Contrato global que Codex e outros agentes devem ler como regra de usuário. |
| `%USERPROFILE%\.codex\skills` | `$HOME/.codex/skills` | Skills do Codex/OMX e skills canônicas espelhadas. |
| `%USERPROFILE%\.codex\agents` | `$HOME/.codex/agents` | Perfis de subagentes Codex. |
| `%USERPROFILE%\.codex\prompts` | `$HOME/.codex/prompts` | Prompts de papéis usados por agentes. |
| `%USERPROFILE%\.agents\skills` | `$HOME/.agents/skills` | Raiz legada de skills para compatibilidade com outras ferramentas. |
| `%USERPROFILE%\.claude\skills` | `$HOME/.claude/skills` | Espelho de skills para Claude Code. |
| `%USERPROFILE%\.opencode\skills` | `$HOME/.opencode/skills` | Espelho de skills para OpenCode. |
| `%USERPROFILE%\.cursor\skills` | `$HOME/.cursor/skills` | Espelho de skills para Cursor. |
| `%USERPROFILE%\.gemini\skills` | `$HOME/.gemini/skills` | Espelho de skills para Gemini CLI. |
| `%USERPROFILE%\.windsurf\skills` | `$HOME/.windsurf/skills` | Espelho de skills para Windsurf. |
| `%USERPROFILE%\.antigravity-skills\skills` | `$HOME/.antigravity-skills/skills` | Espelho de skills para ambientes compatíveis. |
| `%USERPROFILE%\.ai-standards` | `$HOME/.ai-standards` | Standards portáteis usados pelo Antigravity. |
| `%USERPROFILE%\.orquestrador-public-backups` | `$HOME/.orquestrador-public-backups` | Backups criados quando o instalador substitui arquivos existentes. |

O instalador também cria perfis textuais e entrypoints para ferramentas. Eles são os arquivos que fazem o Orquestrador ser chamado por padrão.

| Ferramenta | Entry points instalados |
|---|---|
| Codex | `.codex\AGENTS.md`, `.codex\skills`, `.codex\agents`, `.codex\prompts`, e o `AGENTS.md` global do usuário. |
| OpenCode | `.config\opencode\AGENTS.md`, `.config\opencode\opencode.json`, `.opencode\SYSTEM.md`, `.opencode\rules.md`, `.opencode\maestro.md`, `.opencode\hooks.md`, `.opencode\SKILLS_INDEX.md`, `.opencode\default-skill.json`. |
| Claude Code | `.claude\CLAUDE.md`, `.claude\SYSTEM_PROMPT.md`, `.claude\hooks.md`, `.claude\skills`. |
| Cursor | `.cursor\AGENTS.md`, `.cursor\rules\orquestrador-maestro.mdc`, `.cursor\hooks.md`, `.cursor\skills`. |
| Gemini CLI | `.gemini\GEMINI.md`, `.gemini\hooks.md`, `.gemini\skills`. |
| Windsurf | `.codeium\windsurf\memories\global_rules.md`, `.windsurf\hooks.md`, `.windsurf\skills`. |
| Antigravity | `antigravity-rules.json`, `.antigravity\antigravity.json`, `.antigravity\settings.json`, `.ai-standards`, `.antigravity-skills\skills`. |

Quando algum arquivo de destino já existe, o instalador faz backup antes de substituir, exceto se você usar flags que mudam esse comportamento.

## Como Funciona

O Orquestrador Maestro trabalha por hierarquia. A IA não deve sair abrindo tudo. Ela deve ler primeiro os contratos compactos, escolher o menor conjunto de contexto necessário e só então executar.

### Hierarquia De Leitura

A ordem esperada é:

1. `%USERPROFILE%\.orquestrador\rules.md`
2. `%USERPROFILE%\.orquestrador\maestro.md`
3. `%USERPROFILE%\AGENTS.md`
4. `AGENTS.md` mais próximo do projeto atual
5. documentação `DEV/` do projeto, quando existir
6. skill ou prompt específico da tarefa

Essa ordem separa três tipos de regra:

- regras globais do usuário;
- regras locais do projeto;
- instruções técnicas da skill escolhida.

Se houver conflito entre documentos, a regra mais especifica e mais próxima da tarefa deve orientar a execução, sem ignorar restrições de segurança e privacidade.

### Papel Orquestrador/Maestro

O modelo de trabalho é:

- a IA atua como Orquestrador;
- o usuário atua como Maestro;
- o Orquestrador executa, roteia, verifica e reporta;
- o Maestro decide objetivos, autoriza escopos sensíveis e aprova publicação.

Na prática, isso evita que a IA invente um processo novo a cada projeto. Ela passa a seguir o ciclo padrão abaixo.

### Ciclo De Execução

1. **Observar**: ler regras globais, projeto atual, status do workspace e documentos `DEV/` relevantes.
2. **Classificar**: entender se a tarefa é simples, padrão, profunda, multiagente, SaaS ou segurança.
3. **Rotear**: consultar aliases, router e perfis antes de abrir skills grandes.
4. **Selecionar**: carregar apenas o `SKILL.md` principal e referencias diretamente necessárias.
5. **Executar**: fazer a alteração, investigação ou documentação pedida.
6. **Verificar**: rodar o menor conjunto de verificações que prova o resultado.
7. **Registrar**: atualizar `DEV/WORKLOG.md` quando houve trabalho substancial no projeto local.
8. **Reportar**: explicar o que mudou, o que foi verificado e qualquer risco restante.

## Roteamento De Skills

O roteamento foi desenhado para economizar tokens. Em vez de carregar toda a biblioteca, a IA deve usar os arquivos compactos do Orquestrador:

| Arquivo | Função |
|---|---|
| `SKILLS_INDEX.md` | Índice humano curto para descobrir grupos de skills. |
| `SKILL_ALIASES.json` | Mapeia termos do usuário para skills canônicas. |
| `SKILLS_ROUTER.json` | Catálogo operacional com gatilhos, caminhos, custo e segurança. |
| `SKILL_CHAINS.json` | Define combinações permitidas de skills quando uma tarefa cruza vários domínios. |
| `SKILL_EXECUTION_PROFILES.json` | Define perfis de execução: `fast`, `standard`, `deep`, `multiagent`, `saas` e `security`. |
| `SKILL_USAGE_SCHEMA.json` | Esquema opcional para registrar uso de skills em JSONL. |

Exemplo:

```text
Pedido: "Crie um SaaS com login, planos, Stripe, painel admin e limites por assinatura."

Fluxo esperado:
1. escolher perfil saas;
2. selecionar skill-saas-factory como skill principal;
3. chamar skill-stripe-integration, skill-saas-admin-dashboard e skill-saas-core-limits se a tarefa exigir;
4. aplicar skill-supabase-rls ou skill-saas-security-scan quando houver banco, tenancy ou segurança;
5. verificar build, tipos, testes e riscos do fluxo de pagamento.
```

## Perfis De Execução

| Perfil | Quando usar | Comportamento esperado |
|---|---|---|
| `fast` | Ajuste pequeno, resposta curta ou tarefa óbvia. | Uma skill no maximo, verificação mínima útil. |
| `standard` | Maioria das tarefas de código, docs e configuração. | Até três skills, verificação proporcional ao risco. |
| `deep` | Mudança ampla, arquitetura, várias áreas ou risco maior. | Mais leitura, plano explícito e verificação mais forte. |
| `multiagent` | Usuário pede time, swarm, paralelo ou agentes. | Divisão de responsabilidades e integração final. |
| `saas` | Produto SaaS, dashboard, billing, tenancy, limites, analytics. | Skills de produto, segurança, dados e verificação de fluxos. |
| `security` | Revisão ou scan defensivo autorizado. | Escopo explícito, ferramentas defensivas e cuidado com dados. |

## Skills Principais

As skills canônicas ficam em `orquestrador/skills/` e são espelhadas para as pastas das ferramentas durante a instalação.

| Skill | O que faz |
|---|---|
| `skill-saas-factory` | Skill guarda-chuva para planejar, construir ou revisar SaaS. Coordena arquitetura, produto, pagamento, admin, segurança e analytics. |
| `skill-saas-admin-dashboard` | Padroniza painel admin com usuários, tenants, planos, billing, logs, métricas, filtros e operações de suporte. |
| `skill-abacatepay-integration` | Guia integração com AbacatePay, incluindo PIX/cartão, CPF/CNPJ, webhooks, recibos, reembolso e entitlements. |
| `skill-stripe-integration` | Guia Stripe Checkout, Billing, subscriptions, portal, invoices, trials, coupons, webhooks e estado de assinatura. |
| `skill-saas-core-limits` | Define limites de plano, cotas, entitlements, grace period, bloqueios e contadores de uso. |
| `skill-supabase-rls` | Modela RLS, isolamento de tenant, policies, storage, service role, índices e testes positivo/negativo. |
| `skill-saas-security-scan` | Orquestra scans defensivos locais com Semgrep, Gitleaks, Trivy, OSV-Scanner e npm audit quando disponiveis. |
| `skill-saas-dast-recon` | Orquestra DAST/recon conservador em alvo próprio ou autorizado, com rate limit e ferramentas opcionais. |
| `skill-security-hooks` | Instala hooks Git defensivos e gates de CI sem sobrescrever configuração existente. |
| `skill-ai-orchestration` | Estrutura uso server-side de IA: provedores, roteamento de modelos, fallback, filas, retries, tokens e observabilidade. |
| `skill-multiagent-orchestration` | Divide trabalho independente entre agentes, define posse por arquivos e mantem integração final. |
| `skill-aionui-cowork-orchestration` | Integra AionUi como camada de coordenação sem substituir Codex, skills, hooks e permissões locais. |
| `skill-evolution-api` | Guia automação WhatsApp com Evolution API: instancias, QR, webhooks, consentimento, filas e rate limits. |
| `skill-frontend-ux-guardrails` | Aplica gates de UX: responsividade, overflow, acessibilidade, consistência visual e validação em telas. |
| `skill-modern-ui-patterns` | Orienta UI SaaS/admin com React, TypeScript, Tailwind, estados de componentes e design system. |
| `skill-open-design-ui` | Guia redesign visual, tokens, biblioteca de componentes e QA visual. |
| `skill-live-processing` | Desenha pipeline de live/VOD com captura, filas, transcrição, clips, storage, retries e workers. |
| `skill-manual-vídeo-processing` | Guia upload manual de vídeo/áudio com validação, malware scan, cotas, jobs assíncronos e signed URLs. |
| `skill-smart-clip-detection` | Detecta candidatos de clips por transcript/mídia, score, timestamps, batches e revisão. |
| `skill-unified-analytics` | Define taxonomia de eventos, métricas, funis, dashboards, privacidade, ativação, retenção e billing metrics. |
| `skill-elevenlabs-voice-cloning` | Integra TTS/clonagem ElevenLabs com consentimento, uploads seguros, jobs e proteção de biometria vocal. |
| `skill-google-workspace-sync` | Guia OAuth, Calendar, Meet, Drive, Sheets, webhooks, escopos mínimos e reconciliação. |

As skills workflow do Codex/OMX ficam em `codex/skills/`. Elas cobrem execução, revisão, planejamento, delegação, diagnóstico, consulta a outros modelos e modos de trabalho como `ralph`, `team`, `ultrawork`, `deep-interview`, `code-review` e `security-review`.

O catálogo completo esta em [docs/skill-catalog.md](docs/skill-catalog.md).

## Hooks

Neste repositório, "hook" significa uma regra ou ponto de execução que muda o comportamento da IA ou de uma ferramenta. Alguns hooks são instruções em Markdown. Outros são scripts instaláveis.

| Hook | Onde fica | Lógica |
|---|---|---|
| Preflight | `orquestrador/hooks.md` | Antes de trabalho amplo, ler contratos, projeto, DEV e roteadores. |
| Skill routing | `SKILL_ALIASES.json`, `SKILLS_ROUTER.json`, `SKILL_CHAINS.json` | Escolher a menor skill suficiente para a tarefa. |
| Token budget | `orquestrador/hooks.md` | Evitar carregar catálogos grandes; abrir apenas arquivos necessários. |
| Verification | `orquestrador/hooks.md` | Verificar antes de declarar conclusão. |
| Project DEV | `PROJECT_DEV_HIERARCHY.md` | Ler memória local do projeto e atualizar `DEV/WORKLOG.md` após trabalho substancial. |
| Tool entrypoints | `PROGRAM_ENTRYPOINTS.json`, `tool-profiles/` | Fazer cada ferramenta encontrar o Orquestrador no caminho nativo dela. |
| Skill sync | `sync-skills.ps1` | Espelhar skills canônicas para `.codex`, `.agents`, `.claude`, `.opencode`, `.cursor`, `.gemini`, `.windsurf` e `.antigravity-skills`. |
| Usage log | `SKILL_USAGE_SCHEMA.json` | Padrão opcional para registrar qual skill foi escolhida, aberta e verificada. |
| Security Git hooks | `skill-security-hooks/scripts/install-security-hooks.cmd` | Instalar `pre-commit` e `pre-push` defensivos em repositórios autorizados. |

## Hierarquia DEV Nos Projetos

A pasta `DEV/` é a memória operacional local de cada projeto. Ela não é a pasta `DEV/` deste clone público. Neste repositório, `DEV/` local é ignorada pelo Git. A convenção publicada fica em [docs/project-dev-hierarchy.md](docs/project-dev-hierarchy.md) e nos scripts.

Estrutura recomendada:

```text
DEV/
  README.md
  INDEX.md
  CONTEXT.md
  WORKLOG.md
  ARCHITECTURE.md
  DECISIONS.md
  ADR/
  API/
  DATABASE/
  RUNBOOKS/
  TASKS/
  RESEARCH/
  HANDOFFS/
```

Ordem de leitura dentro de um projeto:

1. `AGENTS.md` do projeto, se existir.
2. `DEV/README.md` ou `DEV/INDEX.md`.
3. `DEV/CONTEXT.md`.
4. documentos específicos da tarefa.
5. skills globais do Orquestrador.

A IA não deve carregar a pasta `DEV/` inteira por padrão. Ela deve usar os índices para economizar tokens.

Depois de trabalho substancial, a IA deve registrar uma entrada curta em `DEV/WORKLOG.md`:

```text
## YYYY-MM-DD - Título curto

- Alterado: caminhos ou áreas mexidas.
- Motivo: uma frase.
- Verificado: comando ou checagem manual.
- Próximo contexto: só o que a próxima IA precisa saber.
```

Para criar `DEV/` em um projeto:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\init-project-dev.ps1 -ProjectPath "C:\caminho\do\projeto"
```

Depois da instalação, também existe o helper instalado no usuário:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\.orquestrador\bin\init-project-dev.ps1" -ProjectPath "C:\caminho\do\projeto"
```

O script cria a estrutura base sem sobrescrever arquivos existentes.

## Como Pedir Para A IA Trabalhar Com O Orquestrador

Pedido padrão:

```text
Leia meu AGENTS.md global, aplique o Orquestrador Maestro, leia o AGENTS.md deste projeto,
use DEV/ como memória operacional se existir, escolha a skill mínima necessária,
execute a tarefa e verifique antes de concluir.
```

Pedido para tarefa com docs:

```text
Atualize a documentação do projeto seguindo a hierarquia DEV/.
Leia DEV/INDEX.md e DEV/CONTEXT.md, edite os arquivos duráveis corretos
e deixe um resumo curto em DEV/WORKLOG.md.
```

Pedido para SaaS:

```text
Use o Orquestrador Maestro com perfil saas.
Roteie por skill-saas-factory e chame skills de Stripe, admin, limites,
RLS ou segurança apenas se forem necessárias para esta tarefa.
```

Pedido para revisão:

```text
Use o Orquestrador Maestro com foco de code review.
Priorize bugs, regressões, riscos de segurança, dados sensíveis e testes faltantes.
Mostre achados com arquivo e linha antes do resumo.
```

## Opções De Instalação

Instalação padrão:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

Instalar sem forçar sobrescrita do núcleo se ele já existir:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -NoForce
```

Instalar apenas o núcleo Orquestrador e o `AGENTS.md` global:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -CoreOnly
```

Instalar sem hooks/perfis das ferramentas:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -NoToolProfiles
```

Instalar em outro home, útil para teste:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -HomePath "C:\Temp\TestHome"
```

Verificar uma instalação feita em outro home:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-install.ps1 -HomePath "C:\Temp\TestHome"
```

## Atualizar Uma Instalação

Para atualizar a instalação de um usuário:

```powershell
git pull
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-install.ps1
```

O instalador cria backups antes de substituir arquivos conhecidos. Se você fez alterações locais nos arquivos instalados, revise os backups em `%USERPROFILE%\.orquestrador-public-backups`.

## Atualizar Este Repositório Público

Este repositório é um snapshot público. Em uma máquina fonte, depois de alterar o Orquestrador local, o fluxo recomendado e:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\sync-from-local.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-public.ps1
git diff -- .
```

So faca commit e push depois de revisar o diff e confirmar que não ha dados privados.

## Segurança E Privacidade

Este pacote deve ser publicável. As regras são:

- não publicar tokens, chaves, credenciais, `.env`, `auth.json`, `config.toml` privado ou cookies;
- não publicar logs, sessões, memória local, cache, backups ou histórico de execução;
- não publicar caminhos reais de usuário;
- não publicar a pasta `DEV/` local deste clone;
- usar placeholders como `{{USER_HOME}}`, `{{USER_NAME}}`, `{{USER_FULL_NAME}}` e `%USERPROFILE%`;
- revisar `git diff -- .` antes de subir;
- rodar `scripts/validate-public.ps1` antes de publicar.

O validador público verifica:

- JSON inválido;
- caminhos concretos de home do Windows;
- literais privados configurados;
- padrões comuns de tokens;
- arquivos de log e backup;
- diretórios locais proibidos;
- marcadores comuns de mojibake.

## Estrutura Do Repositório

```text
.
  AGENTS.md
  README.md
  install.ps1
  codex/
    agents/
    prompts/
    skills/
  docs/
  home/
    AGENTS.md
  orquestrador/
    rules.md
    maestro.md
    hooks.md
    PROJECT_DEV_HIERARCHY.md
    PROGRAM_ENTRYPOINTS.json
    SKILL_ALIASES.json
    SKILL_CHAINS.json
    SKILL_EXECUTION_PROFILES.json
    SKILL_USAGE_SCHEMA.json
    SKILLS_INDEX.md
    SKILLS_ROUTER.json
    bin/
    blueprints/
    skills/
  scripts/
    install.ps1
    verify-install.ps1
    validate-public.ps1
    sync-from-local.ps1
    init-project-dev.ps1
  skill-library/
    community-skills/
  tool-profiles/
```

## Documentação Principal

- [docs/installation.md](docs/installation.md): instalação completa, destinos criados e troubleshooting.
- [docs/orquestrador.md](docs/orquestrador.md): download, instalação, verificação, uso e atualização.
- [docs/orquestrador-reference.md](docs/orquestrador-reference.md): lógica interna, roteamento, hooks, perfis, agentes, sync e verificação.
- [docs/skill-catalog.md](docs/skill-catalog.md): catálogo das skills canônicas, Codex e comunitarias publicadas.
- [docs/ai-agent-operating-guide.md](docs/ai-agent-operating-guide.md): como as IAs devem resolver tarefas usando o Orquestrador.
- [docs/project-dev-hierarchy.md](docs/project-dev-hierarchy.md): hierarquia `DEV/` para documentação e memória de projetos.
- [docs/skill-packs.md](docs/skill-packs.md): composição dos pacotes de skills.
- [docs/tool-profiles.md](docs/tool-profiles.md): hooks e perfis de ferramentas.
- [docs/privacy-model.md](docs/privacy-model.md): modelo de privacidade e sanitização.
- [docs/update-flow.md](docs/update-flow.md): como atualizar este repo a partir da máquina fonte.

## Troubleshooting

Se a ferramenta não chamar o Orquestrador:

1. rode `scripts\verify-install.ps1`;
2. confirme se o arquivo global da ferramenta existe;
3. confirme se o arquivo aponta para `%USERPROFILE%\AGENTS.md` ou `%USERPROFILE%\.orquestrador`;
4. reinicie a ferramenta;
5. se a ferramenta tiver regras globais em UI ou nuvem, copie o contrato do `AGENTS.md` global para esse local.

Se a IA não encontrar as skills:

1. verifique `%USERPROFILE%\.orquestrador\skills`;
2. verifique `%USERPROFILE%\.codex\skills`;
3. rode `%USERPROFILE%\.orquestrador\sync-skills.ps1 -Apply`;
4. rode novamente `scripts\verify-install.ps1`.

Se aparecer texto quebrado:

1. confirme que os arquivos estão em UTF-8;
2. rode `scripts\validate-public.ps1`;
3. corrija qualquer marcador de mojibake antes de publicar.

## Descrição E Topics Para GitHub

Descrição curta sugerida para o campo About:

```text
Grupo IAPro initiative: AI agent orchestration kit for Windows with Codex skills, hooks, tool profiles, project DEV memory and portable setup for Claude Code, OpenCode, Cursor, Gemini CLI, Windsurf and Antigravity.
```

Topics sugeridos:

```text
ai-agents agent-orchestration codex-skills claude-code opencode cursor gemini-cli windsurf antigravity windows powershell developer-tools ai-workflows prompt-engineering multi-agent skills hooks ai-community iapro
```

Palavras-chave naturais do README:

- Grupo IAPro;
- comunidade de IA no WhatsApp e Discord;
- AI agent orchestration;
- Codex skills;
- Claude Code skills;
- OpenCode configuration;
- Cursor AI rules;
- Gemini CLI context;
- Windsurf global rules;
- Windows PowerShell installer;
- project memory;
- DEV documentation hierarchy;
- multi-agent workflow;
- secure public AI configuration.

## Publicação

Antes de subir alterações:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-public.ps1
git diff -- .
```

O repositório deve continuar instalavel, revisavel e seguro para publicação.
