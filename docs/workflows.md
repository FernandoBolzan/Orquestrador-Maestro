# Workflows declarativos

O Orquestrador Maestro agora possui contratos opt-in para trabalhos que precisam de mais estrutura do que um fluxo direto. O perfil `phase-loop` organiza a execução em `discuss`, `plan`, `execute`, `verify` e `ship`, mantendo a experiência padrão intacta.

## Quando usar

Use `phase-loop` para mudanças amplas, releases, migrações, revisões com vários agentes ou tarefas em que a retomada por outra sessão é importante. Para uma alteração pequena, `fast` ou `standard` continua sendo o caminho mais leve.

Os workflows declarativos estão em [`orquestrador/WORKFLOW_SCHEMAS.json`](../orquestrador/WORKFLOW_SCHEMAS.json). A versão 2 adiciona etapas, eventos, gates humanos, retry e workspace lógico. O schema continua descritivo: não executa agentes nem cria integrações obrigatórias.

## Contratos complementares

- [`TASK_SCHEMA.json`](../orquestrador/TASK_SCHEMA.json) define identidade, status, dependências, subtarefas, artefatos, aprovações e execução.
- [`WORKSPACE_SCHEMA.json`](../orquestrador/WORKSPACE_SCHEMA.json) define isolamento por repositório, branch, worktree e executor sem publicar caminhos locais.

Esses contratos permitem que uma futura CLI, integração MCP ou interface visual coordene tarefas sem acoplar o núcleo a um provedor de agentes. A execução real e qualquer efeito externo continuam sujeitos à autorização humana e às regras do projeto.

## Contrato das fases

1. `discuss`: registrar objetivo, restrições, escopo e riscos.
2. `plan`: transformar o objetivo em tarefas verificáveis.
3. `execute`: implementar em fatias pequenas e registrar checkpoints.
4. `verify`: executar testes, validações e revisão proporcional ao risco.
5. `ship`: preparar changelog, handoff, pacote e evidência de publicação.

O comando de briefing continua compatível com o fluxo anterior e pode resumir o estado de `DEV/` antes de cada fase. O gate dedicado está disponível em `orquestrador/bin/check-dev-gates.js`, com wrappers PowerShell e Bash.

## Evolução segura

O perfil não altera o roteamento padrão, não exige um provedor de IA e não substitui os launchers existentes. A adoção pode ser gradual: primeiro os artefatos e gates, depois delegação e integrações específicas quando houver necessidade real.
