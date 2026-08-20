# Linguagem

Use este vocabulario em relatorios e conversas. A regra principal e: responder na lingua do usuario e do projeto. Em projetos pt-BR, use os termos em portugues abaixo. Use o termo em ingles apenas quando precisar fazer a ponte com literatura tecnica ou codigo existente.

## Termos

**Modulo**:
Qualquer parte com uma interface e uma implementacao. Pode ser uma funcao, classe, pacote, feature ou fatia de fluxo.
_Evitar_: unidade, componente, servico, camada, quando essas palavras deixarem a ideia menos precisa.

**Interface**:
Tudo que outro codigo precisa saber para usar o modulo corretamente: tipos, invariantes, ordem de chamada, erros possiveis, configuracao e custo de execucao.
_Evitar_: API, assinatura, quando a palavra reduzir a interface apenas ao formato tecnico da chamada.

**Implementacao**:
O codigo interno do modulo. Use "implementacao" para falar do que fica por dentro.

**Profundidade**:
Quanto comportamento existe por tras de uma interface pequena. Um modulo e **profundo** quando entrega muito comportamento com pouca superficie para o chamador aprender. Um modulo e **raso** quando a interface e quase tao trabalhosa quanto a implementacao.

**Ponto de encaixe**:
Lugar onde a interface de um modulo vive, permitindo mudar comportamento sem editar todos os chamadores. Equivale a "seam".
_Evitar_: fronteira, limite, boundary.

**Adaptador**:
Implementacao concreta usada em um ponto de encaixe. Exemplo: um adaptador HTTP em producao e um adaptador em memoria nos testes.

**Aproveitamento**:
O ganho para os chamadores: uma regra ou comportamento bem colocado serve para varios fluxos.
Equivale a "leverage".

**Localidade**:
O ganho para manutencao: mudancas, bugs, conhecimento e verificacao ficam concentrados em um lugar.
Equivale a "locality".

## Principios

- **Aprofundar um modulo** quer dizer colocar mais comportamento por tras de uma interface menor e mais clara.
- **Profundidade pertence a interface, nao ao tamanho da implementacao.** Um modulo profundo pode ter varios metodos internos, mas os chamadores nao precisam conhecer esses detalhes.
- **Teste da exclusao**: imagine apagar o modulo. Se a complexidade some, o modulo era so passagem. Se a complexidade volta espalhada por varios chamadores, o modulo estava pagando seu custo.
- **A interface e a superficie de teste.** Os testes devem atravessar o mesmo ponto de encaixe que os chamadores usam.
- **Um adaptador e um ponto de encaixe hipotetico. Dois adaptadores tornam o ponto de encaixe real.** Evite criar abstracao quando nada varia ali.

## Relacao entre termos

- Um **Modulo** tem uma **Interface**.
- A **Profundidade** mede o comportamento que a interface esconde.
- O **Ponto de encaixe** e onde a interface e usada.
- Um **Adaptador** satisfaz uma interface em um ponto de encaixe.
- Profundidade gera **Aproveitamento** para chamadores e **Localidade** para manutencao.

## Frases recomendadas em pt-BR

- "Aprofundar o Cadastro de planejamento de custo."
- "Este modulo esta raso: a interface exige saber quase todos os detalhes da implementacao."
- "A regra esta vazando para os chamadores."
- "Um ponto de encaixe com dois adaptadores se justifica: producao e teste."
- "Localidade: a regra muda em um lugar."
- "Aproveitamento: uma interface atende varios fluxos."
