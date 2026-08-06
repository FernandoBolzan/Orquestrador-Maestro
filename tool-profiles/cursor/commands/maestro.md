# Reidratar o Orquestrador Maestro

Se o contexto for amplo, use internamente `orquestrador-maestro context brief --task "<intenção atual>"` antes de abrir documentos adicionais. O Maestro continua usando apenas a conversa.

Reidrata o contexto operacional antes de continuar a tarefa atual.

Leia nesta ordem, sem abrir catálogos inteiros:

1. `{{USER_HOME}}/AGENTS.md`
2. `{{USER_HOME}}/.orquestrador/rules.md`
3. `{{USER_HOME}}/.orquestrador/maestro.md`
4. O `AGENTS.md` mais próximo do projeto atual
5. Se existir `DEV/`, leia `DEV/README.md` ou `DEV/INDEX.md`, `DEV/HANDOFF.md`, `DEV/CONTEXT.md` e `DEV/SPECS/ACTIVE.md`
6. Consulte `{{USER_HOME}}/.orquestrador/SKILLS_ROUTER.json` somente para escolher a skill necessária

Depois de ler:

- confirme internamente que o usuário é o Maestro e você é o Orquestrador;
- retome a tarefa atual a partir do handoff e da spec ativa;
- não reinicie uma solução já concluída nem invente contexto ausente;
- se não houver handoff, diga exatamente qual contexto está faltando e peça apenas a informação mínima necessária;
- continue a execução com verificação proporcional e registre mudanças substantivas no `DEV/`.

Pedido atual do Maestro:

{{input}}
