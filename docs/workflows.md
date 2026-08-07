# Workflows declarativos

O Orquestrador Maestro agora possui contratos opt-in para trabalhos que precisam de mais estrutura do que um fluxo direto. O perfil `phase-loop` organiza a execução em `discuss`, `plan`, `execute`, `verify` e `ship`, mantendo a experiência padrão intacta.

## Quando usar

Use `phase-loop` para mudanças amplas, releases, migrações, revisões com vários agentes ou tarefas em que a retomada por outra sessão é importante. Para uma alteração pequena, `fast` ou `standard` continua sendo o caminho mais leve.

Os workflows declarativos estão em [`orquestrador/WORKFLOW_SCHEMAS.json`](../orquestrador/WORKFLOW_SCHEMAS.json). Eles descrevem fases e gates; não executam agentes nem criam integrações obrigatórias.

## Contrato das fases

1. `discuss`: registrar objetivo, restrições, escopo e riscos.
2. `plan`: transformar o objetivo em tarefas verificáveis.
3. `execute`: implementar em fatias pequenas e registrar checkpoints.
4. `verify`: executar testes, validações e revisão proporcional ao risco.
5. `ship`: preparar changelog, handoff, pacote e evidência de publicação.

O comando de briefing continua compatível com o fluxo anterior e pode resumir o estado de `DEV/` antes de cada fase. O gate dedicado está disponível em `orquestrador/bin/check-dev-gates.js`, com wrappers PowerShell e Bash.

## Evolução segura

O perfil não altera o roteamento padrão, não exige um provedor de IA e não substitui os launchers existentes. A adoção pode ser gradual: primeiro os artefatos e gates, depois delegação e integrações específicas quando houver necessidade real.
