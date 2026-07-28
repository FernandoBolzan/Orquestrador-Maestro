# RFC-0001: Contrato de memória entre agentes

- Status: `Review`
- Data: 2026-07-28
- Área: memória operacional e handoff

## Problema

O Orquestrador já define uma memória curta de projeto em `DEV/`, mas a recuperação ainda depende de cada ferramenta executar corretamente a leitura e a atualização dos arquivos. Trocar de agente ou encerrar uma sessão pode perder decisões, perguntas abertas e tentativas que falharam.

## Objetivos

- manter `DEV/` como contrato operacional legível e versionável;
- permitir recuperação entre ferramentas diferentes;
- separar estado atual, decisões aprovadas e histórico episódico;
- impedir que memória automática altere regras ou specs sem aprovação.

## Não objetivos

- armazenar transcrições completas por padrão;
- substituir `AGENTS.md`, `DEV/SPECS/ACTIVE.md` ou `DEV/VERIFY.md`;
- exigir um servidor, banco vetorial ou provedor de LLM.

## Proposta

O contrato canônico continua sendo:

| Camada | Fonte de verdade | Uso |
|---|---|---|
| Global | `AGENTS.md` e regras do Orquestrador | contrato do usuário |
| Projeto | `DEV/CONTEXT.md` e `DEV/SPECS/ACTIVE.md` | estado e escopo atuais |
| Sessão | `DEV/HANDOFF.md` | retomada imediata |
| Verificação | `DEV/VERIFY.md` | evidência de conclusão |
| Histórico | `DEV/WORKLOG.md` e arquivo arquivado | mudanças recentes e contexto frio |
| Memória longa opcional | provider externo | busca e consolidação sob demanda |

Um provider pode capturar observações sanitizadas e gerar sugestões, mas só o fluxo normal do projeto pode promover uma sugestão para regra, decisão ou spec.

## Alternativas

- Apenas arquivos `DEV/`: simples, portátil e seguro, mas depende de disciplina manual.
- Substituir `DEV/` por banco de memória: melhor busca, porém aumenta acoplamento e risco operacional.
- Provider opcional: preserva o caminho simples e permite memória longa quando houver necessidade.

## Critérios de aceite

- uma instalação sem provider continua funcionando integralmente;
- a troca de ferramenta recupera o handoff atual sem exigir histórico completo;
- decisões e regras continuam editáveis em Markdown;
- toda sugestão automática tem origem, data, escopo e estado de aprovação;
- o usuário consegue apagar a memória externa sem apagar o projeto.

## Decisão pendente

Avaliar a RFC-0002 e a RFC-0003 antes de aceitar este contrato.

