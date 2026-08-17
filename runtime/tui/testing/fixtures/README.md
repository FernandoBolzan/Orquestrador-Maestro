# TUI test fixtures

- `skills/`: subset verificável do manifesto público de 42 skills.
- `attention/`: ciclo `attention.created` → `attention.resolved`.
- `terminal/`: sessão e stream F8 `agentSession.output` sem dados pessoais.
- `events/`: snapshot, delta, gap e reconnect do protocolo F3/F7.
- `project-snapshots/`: snapshot completo mínimo por projeto.

Fixtures são dados estáticos sanitizados. O harness resolve somente caminhos relativos
registrados e nunca lê arquivos fora desta árvore.
