# Contratos de tarefa e workspace

O Maestro usa três contratos relacionados:

1. `WORKFLOW_SCHEMAS.json` descreve fases, etapas, eventos e gates.
2. `TASK_SCHEMA.json` descreve uma unidade de trabalho e suas dependências.
3. `WORKSPACE_SCHEMA.json` descreve onde a tarefa pode operar e como evitar colisões.

## Relação entre os contratos

```text
Task
├── workflow → Workflow.steps
├── repositories → Workspace.repositories
├── currentStep → etapa ativa
├── artifacts → evidências produzidas
└── approvals → gates humanos
```

## Regras de implementação futura

- A implementação deve aceitar os campos legados `phases` e `gates`.
- Um executor pode interpretar `onEnter`, `onComplete` e `onFailure`, mas não pode inferir autorização para efeitos externos.
- Tarefas filhas devem herdar defaults do pai e registrar somente as exceções.
- Paralelismo exige worktrees ou outra forma explícita de isolamento.
- O estado transitório de um executor deve ficar separado dos artefatos públicos e dos arquivos `DEV/`.
- Commit, push, publicação e compartilhamento devem ser gates distintos.

Os schemas são contratos portáveis, não uma autorização para executar comandos.
