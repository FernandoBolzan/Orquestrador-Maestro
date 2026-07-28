# RFC-0003: Captura e privacidade da memória

- Status: `Review`
- Data: 2026-07-28
- Área: privacidade, segurança e retenção

## Problema

Memória automática pode preservar contexto útil, mas também pode registrar segredos, dados pessoais, conteúdo de clientes, caminhos locais e prompts sensíveis.

## Proposta

Qualquer provider de memória deve seguir estas regras:

1. Desligado por padrão.
2. Armazenamento local por padrão.
3. Captura limitada por tipo e tamanho de evento.
4. Exclusões configuráveis por projeto e por caminho.
5. Sanitização antes do armazenamento e uma segunda validação antes da persistência durável.
6. Nenhum conteúdo de memória entra no repositório público.
7. LLM, embeddings e servidor remoto são opt-in separado.
8. Toda consolidação automática gera trilha de auditoria.
9. Deve existir `forget`, backup e restauração documentados.
10. Regras, decisões e preferências globais exigem aprovação explícita.

## Critérios de aceite

- um projeto consegue negar captura de arquivos específicos;
- o usuário consegue listar, exportar e excluir a memória;
- o modo sem LLM continua permitindo busca básica;
- testes comprovam que tokens, `.env`, logs, caches e dados pessoais não são capturados;
- a política de retenção é visível e reversível.

## Decisão pendente

Alinhar os nomes dos arquivos de exclusão e os comandos de consentimento com a implementação do provider escolhido.

