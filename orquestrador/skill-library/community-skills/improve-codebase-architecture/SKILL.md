---
name: improve-codebase-architecture
description: Avaliar a arquitetura de um codigo existente, encontrar friccoes comprovaveis, gerar obrigatoriamente um relatorio HTML e propor refatoracoes incrementais com impacto tecnico e de produto. Usar quando o usuario pedir melhoria arquitetural, crescimento sustentavel, reducao de acoplamento, modulos mais testaveis ou um mapa para decidir onde investir. Em projetos pt-BR, responder integralmente em portugues.
---

# Melhorar a arquitetura do codigo

Encontrar oportunidades reais de tornar o sistema compreensivel, coeso, testavel e facil de evoluir. Nao confundir mais camadas, arquivos ou padroes com melhor arquitetura.

## Principios

- Ler `CONTEXT.md`, ADRs e documentos do dominio antes de opinar. Declarar quando eles nao existirem.
- Seguir o fluxo real: interface ou entrada, caso de uso, dominio, persistencia e integracoes.
- Separar fatos, inferencias e hipoteses. Nao apresentar hiptese como diagnostico.
- Avaliar produto e negocio junto com engenharia: risco operacional, velocidade de entrega, entendimento do time e custo de mudanca futura.
- Explicitar os trade-offs de cada recomendacao: beneficio, custo de implementacao, custo de adiamento, risco de regressao e o que se deixa de priorizar ao executa-la.
- Oferecer insights acionaveis, nao apenas diagnosticos: apontar a decisao que o time precisa tomar, o sinal que confirma ou invalida a proposta e a menor experiencia reversivel para reduzir a incerteza.
- Nao criar abstracoes apenas para dividir arquivos ou mover `if`s. Uma extracao precisa dar dono claro a uma regra e esconder detalhes dos chamadores.

## Procurar evidencia de

- Regras de dominio repetidas ou vazando entre tela, controlador, caso de uso, repositorio e chamadores.
- Servicos de aplicacao que deixaram de orquestrar e passaram a concentrar regras, mapeamentos e decisoes de varios conceitos.
- Modulos rasos, acoplamento excessivo ou testes presos a detalhes internos.
- Mudancas simples que exigem alteracoes em muitos pontos sem razao de dominio.
- Contratos, permissoes, mensagens ou validacoes divergentes entre fronteiras.

Usar SOLID como lente, nao como lista de padroes. Servicos de aplicacao coordenam dependencias, transacoes e efeitos externos; invariantes e decisoes de negocio pertencem ao conceito que as sustenta.

## Processo

1. Delimitar o fluxo e o resultado de negocio analisados.
2. Mapear responsabilidades, chamadores e dependencias relevantes. Registrar somente arquivos e modulos com relacao causal com a friccao.
3. Validar a leitura com testes, buscas por chamadas, contratos ou comportamento observavel quando possivel.
4. Para cada candidato, explicar friccao, dono ausente, mudanca minima, ganho verificavel, risco, custo, trade-offs e motivo para fazer agora ou adiar.
5. Distinguir a visao de arquitetura da visao de produto. A primeira explica responsabilidades, dependencias, contratos, testes e evolucao tecnica. A segunda explica usuario ou operacao afetados, resultado de negocio, tempo de entrega, risco operacional e custo de oportunidade. Nao repetir a mesma frase nas duas secoes.

## Entrega obrigatoria: relatorio HTML e esboco decisorio

Toda analise feita com esta skill deve gerar um relatorio HTML unico no diretorio temporario do sistema. Essa regra e obrigatoria, mesmo quando o usuario nao pedir explicitamente um arquivo, e vale antes de qualquer resumo no chat. Nao entregar apenas texto, Markdown, diagrama isolado ou uma explicacao de que o HTML poderia ser criado.

Depois de criar e verificar o arquivo, responder no chat com um resumo curto e um link para o relatorio. Informar claramente o caminho do arquivo. Prototipos adicionais continuam opcionais; o HTML nao e opcional.

O relatorio HTML deve conter o esboco decisorio abaixo, em ordem de prioridade:

Comecar com resumo executivo de ate cinco linhas. Depois usar este formato, em ordem de prioridade:

```markdown
## [Prioridade] Nome da oportunidade

**Arquivos envolvidos:** `ArquivoA`, `ArquivoB` e `ModuloC`.
**Confianca:** Alta | Media | Baixa.
**Evidencia:** fato observado no fluxo.
**Friccao atual:** impacto tecnico e de produto.
**Esboco da mudanca:** nova distribuicao de responsabilidade e dependencias.
**Visao de arquitetura:** efeito em coesao, acoplamento, contratos, superficie de teste e evolucao.
**Visao de produto:** efeito em usuario, operacao, resultado de negocio, previsibilidade de entrega ou suporte.
**Trade-offs e insights:** beneficios, custos, risco de adiamento, alternativas descartadas e o sinal que orienta a decisao.
**Impacto esperado:** ganho concreto e como valida-lo.
**Custo e riscos:** esforco, compatibilidades e pontos a preservar.
**Proximo passo:** menor acao reversivel que reduz a incerteza.
```

Usar nomes de arquivos e modulos, sem caminhos absolutos ou listas longas de localizacao. Explicar por que cada item e relevante.

Quando tres ou mais elementos tiverem dependencia relevante, incluir um esboco simples:

```text
Antes: Tela -> Servico A -> Servico B -> regra duplicada
Depois: Tela -> Caso de uso -> Politica de dominio -> Repositorio
```

Classificar cada proposta como **Fazer agora**, **Preparar**, **Adiar** ou **Nao recomendar**. Terminar com recomendacao principal, alternativa conservadora e itens fora do escopo. Se nao houver evidencia para mudar, dizer isso claramente.

Detalhar contrato, dono da regra, migracao e testes somente para o candidato escolhido. Criar ADR apenas para decisoes dificeis de reverter, com alternativas reais e motivo duradouro.

## Formato obrigatorio do relatorio HTML

O relatorio deve ser um arquivo HTML unico no diretorio temporario do sistema. Use Tailwind e Mermaid via CDN. O conteudo do relatorio deve seguir a lingua do usuario e do projeto. Em projetos pt-BR, escreva tudo em portugues, incluindo titulos, badges, legendas, secoes, diagramas e pergunta final.

Construa o relatorio como um **mapa de decisao**, nao como uma sequencia de blocos de texto. A pessoa deve conseguir, nesta ordem: entender a decisao principal, localizar as oportunidades por prioridade, comparar impactos e abrir os detalhes de apenas uma oportunidade. Use espaco em branco, rotulos curtos e agrupamento visual para separar assuntos. Nao transforme cada frase em um card: cada card deve representar uma pergunta de decisao completa.

Antes de entregar, verificar que o arquivo existe e contem: documento HTML completo, Tailwind, Mermaid, cabecalho, ao menos um candidato, as secoes de arquitetura, produto e trade-offs, recomendacao principal e o resultado das validacoes executadas. Quando for possivel, abrir ou renderizar o arquivo para uma verificacao visual basica.

### Estrutura do mapa

Organizar a pagina nesta sequencia:

1. **Cabecalho decisorio**: titulo, resumo executivo e os quatro metadados obrigatorios.
2. **Mapa de oportunidades**: navegacao por prioridade que aponta para cada candidato. Mostrar somente titulo, classificacao, confianca e uma frase de resultado. Nao repetir o texto detalhado aqui.
3. **Candidatos**: um `article` por oportunidade, com blocos internos definidos em "Card de candidato".
4. **Recomendacao principal**: card de fechamento, maior e visualmente distinto.
5. **Validacoes e limites**: faixa discreta no fim, com o que foi verificado, o que nao foi verificado e itens fora do escopo.

Em telas largas, usar uma coluna de leitura de 65 a 75 caracteres e uma grade de duas colunas apenas para comparacoes diretas. Em telas pequenas, empilhar tudo em uma coluna sem depender de hover, largura fixa ou texto truncado. Manter uma margem visual clara entre candidatos; dentro de um candidato, usar espacamento menor e consistente entre os blocos.

### Scaffold visual

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Revisao de arquitetura - {{repo name}}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
      mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "loose" });
    </script>
    <style>
      :root { color-scheme: light; }
      html { scroll-behavior: smooth; }
      .pagina { max-width: 76rem; }
      .leitura { max-width: 72ch; }
      .mapa-link:focus-visible, a:focus-visible {
        outline: 3px solid #0f766e;
        outline-offset: 3px;
      }
      .ponto-encaixe { stroke-dasharray: 4 4; }
      .vazamento { stroke: #dc2626; }
      .profundo { background: linear-gradient(135deg, #0f172a, #1e293b); }
    </style>
  </head>
  <body class="bg-stone-50 font-sans text-slate-900 antialiased">
    <main class="pagina mx-auto space-y-12 px-5 py-8 sm:px-8 sm:py-12">
      <header class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">...</header>
      <nav aria-label="Mapa de oportunidades" class="rounded-2xl border border-slate-200 bg-slate-100 p-4">...</nav>
      <section id="candidatos" aria-label="Oportunidades analisadas" class="space-y-12">...</section>
      <section id="recomendacao-principal">...</section>
      <footer id="validacoes">...</footer>
    </main>
  </body>
</html>
```

### Cabecalho

O cabecalho deve responder rapidamente a quatro perguntas, com rotulos literais e linguagem de negocio:

- **Repositorio:** nome do repositorio.
- **Escopo analisado:** fluxo, modulo ou resultado de negocio avaliado.
- **Data da analise:** data de geracao.
- **Decisao principal:** recomendacao de maior prioridade, em uma frase.

Use um titulo direto, como "Revisao de arquitetura do Cadastro de pedidos". Abaixo, apresente no maximo uma frase de resumo executivo. Nao coloque no cabecalho legenda de diagramas, glossario, badges tecnicos, classificacao de dependencia, metodologia, listas de arquivos ou texto teorico. Esses elementos tiram o foco da decisao e nao ajudam quem abre o relatorio pela primeira vez.

Se uma legenda for indispensavel para interpretar um diagrama, posicione uma versao curta imediatamente antes do primeiro diagrama que a utiliza, dentro do candidato correspondente. Omita a legenda quando os rotulos do diagrama ja forem autoexplicativos.

### Mapa de oportunidades

Use um `nav` com links ancora para os candidatos. Cada item e um cartao compacto e clicavel, com prioridade como sinal visual secundario, nao como unica forma de comunicacao. A ordem e: `Fazer agora`, `Preparar`, `Adiar`, `Nao recomendar`.

Cada item mostra somente:

- classificacao e confianca;
- titulo da oportunidade;
- uma frase com a decisao ou resultado esperado;
- indicador textual de impacto: `alto`, `medio` ou `baixo`.

Use cores apenas como reforco: verde-petroleo para fazer agora, azul para preparar, amarelo-ocre para adiar e cinza para nao recomendar. Garantir contraste suficiente e manter o rotulo textual. Nao usar vermelho para prioridade; reservar vermelho para risco, vazamento ou conflito com ADR.

### Card de candidato

Cada candidato deve ser um `<article>`.

Use fundo branco, borda suave, raio generoso e sombra discreta. Cada `article` tem cinco blocos, nesta ordem. Separar os blocos com espacamento e bordas sutis; nao usar bordas pesadas em todos os elementos.

1. **Faixa de decisao**: titulo curto, classificacao, confianca, forca da recomendacao e categoria de dependencia. Incluir uma frase de problema e uma de solucao. Esta faixa responde "o que e" e "por que importa" sem exigir leitura do restante.
2. **Fluxo e escopo**: arquivos envolvidos em chips monoespacados e um unico bloco visual `Antes / Depois`. Usar duas colunas somente quando a comparacao for clara. Quando houver tres ou mais dependencias, preferir Mermaid; caso contrario, usar caixas HTML simples. O diagrama deve ter titulo acessivel e altura maxima de 320px.
3. **Leituras complementares**: grade de duas colunas com os cards "Visao de arquitetura" e "Visao de produto". Cada card deve ter um pequeno rotulo, titulo e no maximo tres bullets ou dois paragrafos curtos. Nao duplicar o mesmo argumento nos dois cards.
4. **Decisao e consequencias**: um card horizontal para "Trade-offs e insights", com beneficio, custo de implementacao, custo de adiamento, principal risco, alternativa nao priorizada e sinal observavel. Usar uma lista de pares `rotulo: valor`, nao um paragrafo longo.
5. **Entrega segura**: grade compacta de tres blocos para "Ganhos", "Custo e riscos" e "Proximo passo". Os ganhos devem usar localidade, aproveitamento e superficie de teste. O proximo passo precisa ser a menor acao reversivel.

Manter cada bloco autocontido. Se uma descricao ultrapassar dois paragrafos curtos, sintetizar e mover o detalhe estritamente necessario para uma lista expansivel `details` com o rotulo "Evidencia e contexto". Nunca esconder a evidencia central, o risco principal ou o proximo passo dentro de `details`.

Quando houver conflito com ADR, inserir um callout vermelho imediatamente apos a faixa de decisao, antes do fluxo. O callout deve identificar o ADR, explicar o conflito em uma frase e indicar a acao necessaria.

#### Esqueleto de candidato

```html
<article id="concentrar-validacao" class="scroll-mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
  <header class="border-b border-slate-200 bg-slate-50 p-6">
    <div class="flex flex-wrap items-center gap-2">badges de decisao e confianca</div>
    <h2 class="mt-3 text-2xl font-semibold tracking-tight">Concentrar a validacao de acesso</h2>
    <div class="mt-4 grid gap-4 lg:grid-cols-2">problema e solucao</div>
  </header>
  <div class="space-y-6 p-6">
    <section aria-labelledby="fluxo-validacao">arquivos e antes/depois</section>
    <section class="grid gap-4 lg:grid-cols-2">visao de arquitetura e visao de produto</section>
    <section>trade-offs e insights</section>
    <section class="grid gap-4 md:grid-cols-3">ganhos, custo e proximo passo</section>
  </div>
</article>
```

As secoes "Visao de arquitetura" e "Visao de produto" sao obrigatorias, mesmo que uma delas conclua que o impacto e neutro. Nao use a secao de produto para repetir detalhes de classes ou padroes. Nao use a secao de arquitetura para alegar valor de negocio sem evidencia.

Evite misturar ingles e portugues. Se uma palavra tecnica em ingles for inevitavel, escreva a traducao primeiro e o ingles entre parenteses uma vez.

### Padroes de diagrama

#### Grafo Mermaid

Use quando a relacao for chamada, dependencia ou fluxo.

```html
<div class="rounded-lg border border-slate-200 bg-white p-4">
  <pre class="mermaid">
    flowchart LR
      A[Modulo chamador] --> B[Modulo atual]
      B -.regra vazando.-> C[Dependencia]
      classDef vazamento stroke:#dc2626,stroke-width:2px;
      class C vazamento
  </pre>
</div>
```

#### Caixas desenhadas a mao

Use quando quiser mostrar um modulo profundo com detalhes internos esmaecidos. Mermaid nem sempre representa bem essa ideia.

#### Corte por camadas

Use para mostrar muitas passagens rasas. Antes: varias faixas finas. Depois: uma faixa grossa com a responsabilidade consolidada.

#### Diagrama de massa

Use para mostrar interface larga e implementacao pequena. Antes: interface quase do tamanho da implementacao. Depois: interface menor, implementacao absorvendo comportamento.

#### Colapso de chamadas

Use quando varias funcoes rasas podem virar detalhes internos de um modulo.

### Estilo

- Visual editorial, simples e claro, com foco em leitura e comparacao de decisoes.
- Usar uma paleta neutra de fundo, uma cor de destaque e cores semanticas somente para estado, risco ou aviso.
- Criar hierarquia por tamanho, peso, espacamento e posicao antes de recorrer a cor.
- Limitar o conteudo principal a 72 caracteres por linha e evitar mais de tres niveis visuais dentro de um card.
- Usar tamanho minimo de 16px para texto corrido, contraste equivalente a WCAG AA e alvos de toque de pelo menos 44px em links e controles.
- Diagramas em torno de 320px de altura, labels em portugues e sem linhas decorativas em excesso.
- Nao usar carrosseis, abas, acordeoes sucessivos, hover como unica interacao, gradientes chamativos, icones decorativos ou animacoes que distraiam da decisao.
- Evitar termos como `Deepen`, `Strong`, `Worth exploring`, `Speculative`, `seam`, `leverage`, `locality` no HTML final quando o projeto for pt-BR.

### Recomendacao principal e validacoes

Terminar com um card maior, de destaque verde-petroleo ou azul escuro, com contraste alto:

- nome do candidato;
- uma frase dizendo por que comecar por ele;
- resumo separado de arquitetura e produto, com uma frase para cada visao;
- trade-off decisivo e o proximo sinal que pode mudar a prioridade;
- link para o card.

Depois dele, inserir a faixa discreta de validacoes. Listar testes, buscas, contratos ou comportamento observavel consultados. Separar claramente:

- **Validado**: evidencia efetivamente verificada.
- **Nao validado**: lacunas que reduzem a confianca.
- **Fora do escopo**: itens deliberadamente nao analisados.

Nao apresentar ausencia de validacao como evidencia positiva.

### Tom e vocabulario

Claro, direto e acessivel. A pessoa lendo deve entender o relatorio sem conhecer a skill.

Use exatamente estes termos em pt-BR quando forem necessarios:

- modulo
- interface
- implementacao
- profundidade
- modulo profundo
- modulo raso
- ponto de encaixe
- adaptador
- aproveitamento
- localidade

Evite:

- `deepen`
- `deep module`
- `shallow`
- `seam`
- `adapter` quando "adaptador" bastar
- `leverage`
- `locality`

Exemplos de frases:

- "Aprofundar o Cadastro de planejamento de custo."
- "A regra de Cargo pendente de decisao esta vazando para o formulario e para a preparacao."
- "Localidade: a regra muda em um lugar."
- "Aproveitamento: a mesma interface atende cadastro, copia e consolidacao."

Depois de abrir o relatorio, pergunte em portugues: "Qual desses candidatos voce quer explorar primeiro?"
