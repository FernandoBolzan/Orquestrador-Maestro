# RFC-0002: Provider opcional baseado em ai-memory

- Status: `Review`
- Data: 2026-07-28
- Área: integração externa e continuidade cross-agent
- Referência: [akitaonrails/ai-memory](https://github.com/akitaonrails/ai-memory)

## Problema

O fluxo atual do Orquestrador é excelente para memória curta, mas não oferece busca conveniente em sessões antigas nem captura automática entre Claude, Codex, Cursor e outros clientes.

## Proposta

Adicionar documentação e uma integração opt-in para usar `ai-memory` como provider de memória longa. A integração deve:

- permanecer fora do caminho obrigatório de instalação;
- usar MCP e hooks nativos quando o cliente suportar;
- manter `DEV/` como fonte de verdade operacional;
- expor apenas briefing, busca e handoff ao agente por padrão;
- enviar propostas de consolidação para revisão antes de alterar regras, decisões ou specs;
- funcionar em modo sem LLM quando possível.

O projeto externo usa Markdown versionado como fonte de verdade e SQLite como índice derivado, com busca FTS5, handoffs, isolamento por projeto e retenção configurável. ([arquitetura](https://github.com/akitaonrails/ai-memory/blob/main/docs/ARCHITECTURE.md))

## Limites de compatibilidade

- Codex pode precisar de `finalize-session` para fechar uma sessão explicitamente.
- Clientes MCP-only não oferecem o mesmo nível de captura de ciclo de vida.
- Windows nativo deve ser tratado como alvo experimental até haver teste automatizado do fluxo completo.
- A integração não deve copiar código, prompts ou assets do projeto externo.

## Alternativas

- Implementar um banco próprio dentro do CLI: maior custo e duplicação.
- Usar somente arquivos `DEV/`: menor complexidade, mas sem busca histórica automática.
- Tornar `ai-memory` obrigatório: descartado por aumentar dependências e superfície de privacidade.

## Critérios de aceite

- instalação padrão não instala nem inicia `ai-memory`;
- documentação explica instalação, remoção, backup e limites;
- captura é explicitamente opt-in e possui exclusões por projeto;
- prompts, tokens, caches, credenciais e caminhos privados não entram no snapshot público;
- existe um teste de smoke para briefing, handoff, busca e desligamento;
- o provider pode ser removido sem modificar o contrato em `DEV/`.

## Decisão pendente

Prototipar primeiro a integração documental e um adaptador mínimo, sem alterar o instalador padrão.

