# Desenho de interface

Use este fluxo quando o usuario escolher um candidato e quiser explorar alternativas de interface para o modulo aprofundado.

Respeitar a lingua do usuario. Em pt-BR, apresentar tudo em portugues e usar o vocabulario de [LANGUAGE.md](LANGUAGE.md).

## Processo

### 1. Enquadrar o problema

Antes de propor alternativas, explicar para o usuario:

- Quais restricoes a nova interface precisa respeitar.
- Quais dependencias ficam por tras do modulo e qual categoria elas usam em [DEEPENING.md](DEEPENING.md).
- Um pequeno esboco de codigo apenas para deixar as restricoes concretas. Nao tratar esse esboco como proposta final.

### 2. Gerar alternativas

Quando subagentes forem permitidos, gerar 3 ou mais alternativas bem diferentes em paralelo. Quando nao forem permitidos, criar as alternativas localmente.

Cada alternativa deve seguir uma restricao diferente:

- Alternativa 1: minimizar a interface, buscando 1 a 3 entradas no maximo.
- Alternativa 2: maximizar flexibilidade para casos futuros.
- Alternativa 3: otimizar o caso mais comum para o chamador.
- Alternativa 4, se fizer sentido: desenhar em torno de pontos e adaptadores.

Cada alternativa deve conter:

1. Interface: tipos, metodos, parametros, invariantes, ordem de chamada e erros.
2. Exemplo de uso.
3. O que a implementacao esconde por tras do ponto de encaixe.
4. Estrategia de dependencia e adaptadores.
5. Trade-offs: onde ha mais aproveitamento e onde a interface fica mais fina.

### 3. Comparar e recomendar

Apresentar as alternativas uma por vez e depois comparar por:

- profundidade
- localidade
- aproveitamento
- ponto de encaixe
- facilidade de teste

Terminar com uma recomendacao opinativa. Se uma combinacao de alternativas for melhor, propor um hibrido.
