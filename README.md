# Orquestrador Maestro

Kit público e sanitizado para padronizar o trabalho de agentes de IA no Windows, Linux e macOS.

O Orquestrador Maestro instala uma camada compartilhada de regras, skills, hooks, perfis de ferramentas e memória operacional de projetos. Ele não é um modelo de IA nem substitui as ferramentas que você já usa: cria um contrato comum para que elas trabalhem com mais consistência, segurança e continuidade.

## Iniciar o cockpit local

No diretório do projeto, mantenha o runtime aberto em um terminal:

```bash
orquestrador-maestro runtime
```

Em outro terminal, abra a interface visual:

```bash
orquestrador-maestro tui
```

Use `A` para escolher um provider e iniciar um agente, `M` para criar uma missão e `S` para abrir um shell. `Enter` entrega o teclado ao terminal selecionado e `Ctrl+]` retorna ao cockpit. Se estiver executando o repositório sem instalação global, substitua `orquestrador-maestro` por `node bin/orquestrador-maestro.js`.

[GitHub](https://github.com/FernandoBolzan/Orquestrador-Maestro) · [Pacote npm](https://www.npmjs.com/package/@iapro/orquestrador-maestro-cli) · [Changelog](CHANGELOG.md)

### Veja o fluxo

| Instalação | Execução | Atualização |
| --- | --- | --- |
| ![Fluxo de instalação do Orquestrador Maestro](docs/assets/install-flow.gif) | ![Fluxo de execução do Orquestrador Maestro](docs/assets/runtime-flow.gif) | ![Fluxo de atualização do Orquestrador Maestro](docs/assets/update-flow.gif) |

Os GIFs mostram a jornada completa: instalar uma vez, trabalhar com uma hierarquia compartilhada e atualizar o snapshot com validação.

## Comece em dois minutos

### macOS e Linux

~~~bash
curl -fsSL https://raw.githubusercontent.com/FernandoBolzan/Orquestrador-Maestro/main/scripts/bootstrap-install.sh | bash
~~~

### Windows PowerShell

~~~powershell
irm https://raw.githubusercontent.com/FernandoBolzan/Orquestrador-Maestro/main/scripts/bootstrap-install.ps1 | iex
~~~

Os bootstraps configuram a instalação no perfil do usuário quando necessário, ajustam o PATH, instalam a CLI e executam a verificação. Para uma instalação normal, não use sudo nem abra o PowerShell como Administrador.

Depois da instalação:

~~~text
orquestrador-maestro install
orquestrador-maestro verify
~~~

No macOS e no Linux, doctor também precisa de pwsh ou powershell disponível no PATH.

## A ideia em uma frase

Você define o objetivo como Maestro; o Orquestrador garante que a IA leia as regras certas, escolha o contexto mínimo, execute com segurança e deixe o projeto pronto para a próxima sessão.

~~~mermaid
flowchart LR
    A[Pedido do Maestro] --> B[Regras globais]
    B --> C[Contexto do projeto]
    C --> D[Roteamento de skills]
    D --> E[Execução com hooks]
    E --> F[Verificação]
    F --> G[Memória DEV]
~~~

## O que o sistema entrega

- Contrato compartilhado para Codex, Claude Code, OpenCode, Cursor, Gemini CLI, Grok CLI, Windsurf e Antigravity.
- Skills especializadas com roteamento para carregar apenas o contexto necessário.
- Hooks e perfis que reforçam segurança, documentação, verificação e economia de contexto.
- Biblioteca completa de skills fora das raízes nativas, reduzindo o custo fixo das sessões.
- Estrutura DEV/ para preservar contexto de projeto entre sessões e ferramentas.
- Instaladores, verificadores, diagnóstico, dry-run e atualização multiplataforma.
- Snapshot público revisável, sem tokens, logs, caches, backups ou memórias privadas.

## Modelo mental

| Papel | Responsabilidade |
| --- | --- |
| **Maestro** | Define objetivo, prioridade, limites e autorizações. |
| **Orquestrador** | Organiza a execução, aplica regras e exige verificação. |
| **Skills** | Playbooks especializados acionados conforme a tarefa. |
| **Hooks** | Lembretes operacionais para segurança, contexto e documentação. |
| **DEV/** | Memória curta e recuperável do projeto. |

A ordem de leitura recomendada é rules.md → maestro.md → AGENTS.md → DEV/ → skill específica.

## Instalação via npm

O pacote oficial é @iapro/orquestrador-maestro-cli, com o executável orquestrador-maestro. A CLI exige Node.js 18 ou superior.

~~~bash
npm install -g @iapro/orquestrador-maestro-cli@latest
orquestrador-maestro install
orquestrador-maestro verify
~~~

O npm install apenas instala a CLI. Os arquivos do usuário só são alterados quando você executa install ou update.

### Comandos principais

| Comando | Finalidade |
| --- | --- |
| install | Instala ou aplica o snapshot no home do usuário. |
| update | Atualiza a instalação e migra raízes antigas. |
| verify | Confere arquivos, skills e entrypoints. |
| doctor | Diagnostica o ambiente operacional. |
| dry-run | Mostra alterações sem gravar arquivos. |
| list-targets | Lista os destinos do instalador. |
| changelog | Exibe as mudanças da versão instalada. |
| init-dev | Cria a memória DEV/ em um projeto. |
| check-dev-gates | Valida spec + handoff + verify + worklog. |
| compact-worklog | Arquiva entradas antigas e mantém o worklog curto. |
| uninstall | Remove arquivos gerenciados. |
| telemetry | Consulta ou administra a telemetria opt-in. |

Para explorar as opções:

~~~bash
orquestrador-maestro --help
orquestrador-maestro dry-run
orquestrador-maestro list-targets
~~~

## Instalação a partir do repositório

### Windows

~~~powershell
git clone https://github.com/FernandoBolzan/Orquestrador-Maestro.git
Set-Location Orquestrador-Maestro
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-install.ps1
~~~

### Linux e macOS

~~~bash
git clone https://github.com/FernandoBolzan/Orquestrador-Maestro.git
cd Orquestrador-Maestro
bash install.sh
bash scripts/verify-install.sh
~~~

Sem Git, use o [ZIP da branch main](https://github.com/FernandoBolzan/Orquestrador-Maestro/archive/refs/heads/main.zip), extraia-o e execute o instalador correspondente.

Antes de alterar arquivos, faça uma prévia:

~~~powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -DryRun
~~~

~~~bash
bash install.sh --dry-run
~~~

## O que é instalado

O instalador usa o home do usuário atual: %USERPROFILE% no Windows e $HOME no Linux/macOS.

| Destino | Conteúdo |
| --- | --- |
| .orquestrador | Núcleo canônico, regras, hooks, roteadores, scripts e bibliotecas. |
| AGENTS.md | Contrato global lido por agentes compatíveis. |
| .codex/skills, .codex/agents, .codex/prompts | Skills, perfis e prompts nativos do Codex. |
| .claude, .opencode, .cursor, .gemini, .windsurf | Entrypoints e skills mínimas para cada ferramenta. |
| .antigravity-skills e .ai-standards | Compatibilidade e standards portáteis do Antigravity. |
| .orquestrador/skill-library | Biblioteca comunitária e catálogo completo fora das raízes nativas. |
| .orquestrador-public-backups | Backups dos arquivos gerenciados substituídos pelo instalador. |

As pastas nativas ficam enxutas de propósito. O excesso de skills é preservado na biblioteca gerenciada, sem inflar automaticamente o contexto de cada ferramenta. Credenciais, sessões, caches e configurações privadas não fazem parte do backup.

## Memória de projetos com DEV/

DEV/ é uma convenção opcional para manter contexto operacional compacto no projeto. Ela evita que cada sessão precise redescobrir arquitetura, decisões e estado do trabalho.

~~~bash
orquestrador-maestro init-dev --project-path .
~~~

| Arquivo | Papel |
| --- | --- |
| DEV/INDEX.md | Mapa da documentação operacional. |
| DEV/HANDOFF.md | Estado atual e próxima ação. |
| DEV/CONTEXT.md | Contexto vivo, comandos, riscos e decisões. |
| DEV/SPECS/ACTIVE.md | Escopo e critérios da tarefa ativa. |
| DEV/VERIFY.md | Verificações executadas e resultados. |
| DEV/WORKLOG.md | Histórico curto de trabalho substancial. |

Valide e compacte a memória quando necessário:

~~~bash
orquestrador-maestro check-dev-gates --project-path . --max-entries 12 --strict
orquestrador-maestro compact-worklog --project-path . --keep 12
~~~

## Trabalhar com uma IA

Use um pedido como este em qualquer projeto instalado:

~~~text
Use o Orquestrador Maestro instalado neste usuário.
Leia primeiro o contrato global, depois o AGENTS.md do projeto e a pasta DEV/, se existirem.
Consulte o roteador de skills, execute a tarefa diretamente e verifique o resultado.
Não faça commit nem push sem minha autorização.
~~~

Para planejamento, execução longa ou revisão, use as skills correspondentes, como $ralplan, $ralph e $code-review.

## Atualizar

### Instalação npm

~~~bash
npm update -g @iapro/orquestrador-maestro-cli
orquestrador-maestro changelog
orquestrador-maestro update
orquestrador-maestro verify
orquestrador-maestro doctor
~~~

### Instalação por Git

~~~bash
git pull
bash install.sh
bash scripts/verify-install.sh
~~~

No Windows:

~~~powershell
git pull
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-install.ps1
~~~

Leia o changelog antes de atualizar uma instalação usada em projetos importantes. O update preserva skills excedentes em .orquestrador/skill-library/disabled-native.

## Telemetria

A telemetria fica desabilitada por padrão. Nenhum evento é enviado sem endpoint configurado e habilitação explícita.

~~~bash
orquestrador-maestro telemetry
orquestrador-maestro telemetry endpoint https://seu-dominio.example/api/orquestrador-telemetry
orquestrador-maestro telemetry enable
orquestrador-maestro telemetry test
orquestrador-maestro telemetry disable
~~~

Quando habilitada, registra apenas metadados operacionais mínimos, como comando, plataforma, arquitetura, versão major do Node.js, sucesso e identificador anônimo. Não envia prompts, conteúdo de projetos, caminhos locais, tokens, logs ou nome do usuário. Veja docs/npm-package.md.

## Segurança e privacidade

Este é um snapshot público e sanitizado. Nunca publique:

- tokens, senhas, chaves de API, cookies ou arquivos .env;
- sessões, logs, caches, backups ou memórias locais;
- configurações privadas de IDE ou ferramentas;
- caminhos reais, nomes pessoais ou dados de outra máquina.

Antes de publicar:

~~~powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-public.ps1
git diff -- .
~~~

O validador procura JSON inválido, padrões de tokens, caminhos concretos, arquivos proibidos e marcadores comuns de mojibake.

## Requisitos e compatibilidade

- Windows 10/11 com PowerShell 4 ou superior.
- Linux ou macOS com Bash 3.2 ou superior.
- Node.js 18 ou superior para a CLI npm.
- Git somente quando a instalação for feita por clone.
- A ferramenta de IA que você deseja integrar, configurada separadamente.

O Orquestrador não instala credenciais, logins, modelos nem chaves de API.

## Integração com Grok CLI

Depois de instalar o Grok CLI oficial:

~~~bash
bash scripts/install-grok-orquestrador.sh
~~~

No Windows:

~~~powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-grok-orquestrador.ps1
~~~

Valide com grok inspect.

## Documentação

- [Testes de segurança](docs/security-testing.md)

- [Instalação detalhada](docs/installation.md)
- [Opções do instalador](docs/installer-options.md)
- [Solução de problemas](docs/installation-troubleshooting.md)
- [Referência técnica](docs/orquestrador-reference.md)
- [Guia operacional para IAs](docs/ai-agent-operating-guide.md)
- [Hierarquia DEV/](docs/project-dev-hierarchy.md)
- [Economia de contexto](docs/context-economy.md)
- [Catálogo de skills](docs/skill-catalog.md)
- [Pacotes de skills](docs/skill-packs.md)
- [Perfis de ferramentas](docs/tool-profiles.md)
- [Modelo de privacidade](docs/privacy-model.md)
- [Integração opcional de memória](docs/ai-memory-integration.md)
- [Fluxo de atualização](docs/update-flow.md)
- [Pacote npm e publicação](docs/npm-package.md)
- [RFCs](docs/rfcs/README.md)
- [Contribuição](CONTRIBUTING.md)

## Solução de problemas

Se uma ferramenta não encontrar o Orquestrador:

1. Rode orquestrador-maestro verify ou o verificador do repositório.
2. Confirme se .orquestrador e AGENTS.md existem no home correto.
3. Reinicie a ferramenta para que ela releia as regras globais.
4. Confira o entrypoint específico em docs/installation.md.

Se houver erro de permissão no npm, reinstale pelo bootstrap recomendado e pelo perfil do usuário. Não misture uma instalação antiga feita como Administrador/root com uma instalação normal sem consultar installation-troubleshooting.md.

Se aparecer texto quebrado, confirme que os arquivos estão em UTF-8 e execute validate-public.ps1 antes de publicar.

## Contribua

Issues, pull requests, documentação, correções de instalação e novas skills são bem-vindos:

1. leia CONTRIBUTING.md;
2. mantenha o snapshot livre de dados privados;
3. rode scripts/validate-public.ps1;
4. rode scripts/validate-skills.ps1 quando aplicável;
5. registre mudanças relevantes no CHANGELOG.md.

O projeto faz parte da iniciativa [Grupo IAPro](https://www.fernandobolzan.com/bio), comunidade para quem constrói, estuda e aplica IA no trabalho real.

## Licença e responsabilidade

Consulte a licença e os avisos do repositório antes de redistribuir. Revise instruções, permissões e integrações antes de aplicá-las em produção.

---

Última revisão editorial: 2026-08-03.
