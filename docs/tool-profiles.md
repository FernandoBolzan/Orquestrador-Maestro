# Tool Profiles

## Grok CLI

The Grok CLI reads the Orquestrador through the same portable `AGENTS.md` and skill roots used by the other agents. Configure a user installation with:

- Windows PowerShell: `scripts/install-grok-orquestrador.ps1`
- Linux/macOS: `scripts/install-grok-orquestrador.sh`

The installer writes `~/.grok/config.toml` and points Grok at `~/.orquestrador/skills` and `~/.agents/skills`. Verify discovery with `grok inspect`.

`tool-profiles/` guarda hooks e perfis textuais selecionados para reaproveitar o comportamento do Orquestrador em outras ferramentas sem publicar o diretório completo de cada uma.

Os hooks e entrypoints estão detalhados em [orquestrador-reference.md](orquestrador-reference.md). Este arquivo explica principalmente quais perfis são empacotados e onde o instalador os coloca.

## Incluído

- `tool-profiles/codex/`: `AGENTS.md` do Codex.
- `tool-profiles/opencode/`: hooks, sistema, regras, maestro e índice de skills.
- `tool-profiles/opencode-global/`: `AGENTS.md` e `opencode.json` globais para `~/.config/opencode`.
- `tool-profiles/claude/`: hooks e prompt de sistema.
- `tool-profiles/cursor/`: hooks.
- `tool-profiles/gemini/`: hooks.
- `tool-profiles/windsurf/`: hooks.
- `tool-profiles/windsurf-global/`: `global_rules.md` para Windsurf/Cascade.
- `tool-profiles/antigravity-home/`: `antigravity-rules.json` instalado no home do usuário.
- `tool-profiles/antigravity/`: `antigravity.json` e `settings.json`.
- `tool-profiles/ai-standards/`: standards portáteis instalados em `~/.ai-standards`.
- `orquestrador/blueprints/project/`: bootstrap de workspace para VS Code, GitHub Copilot, Continue, JetBrains AI Assistant, Aider, Cline e Windsurf.

## Excluído

- OAuth, contas, auth, tokens e configurações MCP locais.
- Histórico de uso, sessões, tracking, browser profile e caches.
- Regras locais de `.codex\rules`, porque podem guardar allowlists e comandos específicos da máquina.
- Diretórios completos de IDE.
- Dados de projetos privados.

## Instalação

O instalador principal já inclui perfis de ferramenta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

Linux/macOS:

```bash
bash install.sh
```

Para pular os perfis:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -NoToolProfiles
```

Linux/macOS:

```bash
bash install.sh --no-tool-profiles
```

No instalador avançado, perfis de ferramenta são opt-in:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install.ps1 -InstallToolProfiles
```

Linux/macOS:

```bash
bash scripts/install.sh --install-tool-profiles --force
```

Se usar o instalador avançado e a máquina já tiver `.orquestrador` ou `AGENTS.md`, use `-Force` para criar backup antes da substituição:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install.ps1 -InstallToolProfiles -Force
```

## Pontos De Entrada Instalados

O pacote instala arquivos nos locais que as ferramentas costumam ler como regra, memória ou configuração global:

| Ferramenta | Arquivo instalado |
|---|---|
| Codex | `%USERPROFILE%\AGENTS.md` e `%USERPROFILE%\.codex\AGENTS.md` |
| OpenCode | `%USERPROFILE%\.config\opencode\AGENTS.md` e `%USERPROFILE%\.config\opencode\opencode.json` |
| Claude Code | `%USERPROFILE%\.claude\CLAUDE.md` |
| Gemini CLI | `%USERPROFILE%\.gemini\GEMINI.md` |
| Cursor | `%USERPROFILE%\.cursor\rules\orquestrador-maestro.mdc`, `%USERPROFILE%\.cursor\AGENTS.md` e `%USERPROFILE%\.cursor\commands\maestro.md` |
| Windsurf/Cascade | `%USERPROFILE%\.codeium\windsurf\memories\global_rules.md` |
| Antigravity | `%USERPROFILE%\antigravity-rules.json`, `%USERPROFILE%\.antigravity\antigravity.json`, `%USERPROFILE%\.antigravity\settings.json` e `%USERPROFILE%\.ai-standards` |
| VS Code + GitHub Copilot | projeto aberto: `.github\copilot-instructions.md` e `.vscode\extensions.json` |
| Continue | projeto aberto: `.continue\rules\00-orquestrador-maestro.md` |
| JetBrains AI Assistant | projeto aberto: `.aiassistant\rules\orquestrador-maestro.md` |
| Aider | projeto aberto: `.aider.conf.yml` |
| Cline | projeto aberto: `.clinerules` |
| Windsurf (projeto) | projeto aberto: `.windsurfrules` |

Todos esses pontos de entrada mandam a ferramenta usar o `AGENTS.md` global, o Orquestrador e, quando existir no projeto aberto, a documentação `DEV/` antes das skills globais. Eles também orientam a manter documentação durável do projeto em `DEV/` e registrar trabalho substancial em `DEV/WORKLOG.md`.

Para VS Code e GitHub Copilot, o bootstrap de projeto cria `.github/copilot-instructions.md` e `.vscode/extensions.json`. Para Continue, JetBrains AI Assistant, Aider, Cline e Windsurf no nível do projeto, o bootstrap cria arquivos reconhecidos por cada ferramenta com o mesmo contrato compacto do Orquestrador. Isso cobre o uso mais comum do ecossistema AI-native dentro do editor ou CLI sem depender de um perfil global específico.

No Linux/macOS, os mesmos pontos ficam sob `$HOME`, como `$HOME/AGENTS.md`, `$HOME/.config/opencode/opencode.json`, `$HOME/.claude/CLAUDE.md`, `$HOME/.cursor/AGENTS.md`, `$HOME/.gemini/GEMINI.md`, `$HOME/.codeium/windsurf/memories/global_rules.md` e `$HOME/.ai-standards`.

Se uma ferramenta estiver em uma versão que só aceita regra global por UI ou conta em nuvem, copie o conteúdo de `%USERPROFILE%\AGENTS.md` no Windows ou `$HOME/AGENTS.md` no Linux/macOS para a regra global dessa ferramenta.

## Matriz De Capacidades

A fonte estruturada da matriz é `orquestrador/PROGRAM_ENTRYPOINTS.json`. A tabela abaixo resume o comportamento público esperado:

| Ferramenta | Componente `Only` | Autoativação | Hook/profile instalado | Reescrita de comando |
|---|---|---|---|---|
| Codex | `codex` | Sim | `AGENTS.md`, skills, agentes e prompts | Não |
| OpenCode | `opencode` | Sim | `AGENTS.md`, `opencode.json`, hooks e skills | Não |
| Claude Code | `claude` | Sim | `CLAUDE.md`, `SYSTEM_PROMPT.md`, hooks e skills | Não por padrão |
| Cursor | `cursor` | Sim | `AGENTS.md`, regra MDC, hooks, comando `/maestro` e skills | Não |
| Gemini CLI | `gemini` | Sim | `GEMINI.md`, hooks e skills | Não |
| Windsurf | `windsurf` | Sim | `global_rules.md`, hooks e skills | Não |
| Antigravity | `antigravity` | Sim | `antigravity-rules.json`, `.antigravity`, `.ai-standards` e skills | Não |
| VS Code + Copilot | `workspace` | Sim, via bootstrap do projeto | `.github/copilot-instructions.md`, `.vscode/extensions.json` | Não |
| Continue | `workspace` | Sim, via bootstrap do projeto | `.continue/rules/00-orquestrador-maestro.md` | Não |
| JetBrains AI Assistant | `workspace` | Sim, via bootstrap do projeto | `.aiassistant/rules/orquestrador-maestro.md` | Não |
| Aider | `workspace` | Sim, via bootstrap do projeto | `.aider.conf.yml` | Não |
| Cline | `workspace` | Sim, via bootstrap do projeto | `.clinerules` | Não |
| Windsurf (projeto) | `workspace` | Sim, via bootstrap do projeto | `.windsurfrules` | Não |

A inspiração do RTK deve ser tratada como futuro wrapper opt-in para saídas compactas, não como hook automático instalado no fluxo padrão. Isso evita alterar comandos do usuário sem consentimento.
