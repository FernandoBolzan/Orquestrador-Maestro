# Aprofundamento

Como aprofundar com seguranca um conjunto de modulos rasos, considerando suas dependencias. Usar o vocabulario de [LANGUAGE.md](LANGUAGE.md).

## Categorias de dependencia

Ao avaliar um candidato, classificar suas dependencias. A categoria define como testar o modulo aprofundado atraves do seu ponto de encaixe.

### 1. No mesmo processo

Calculo puro, estado em memoria, sem I/O. Geralmente pode ser aprofundado diretamente. Testar pela nova interface.

### 2. Substituivel localmente

Dependencias com substitutos locais de teste, como banco em memoria, arquivo temporario ou PGLite. Pode ser aprofundado se o substituto existir. O ponto de encaixe pode ficar interno ao modulo.

### 3. Remoto mas proprio: pontos e adaptadores

Servicos proprios acessados por rede. Definir um ponto de encaixe e injetar um adaptador. A regra fica no modulo profundo. Testes usam adaptador em memoria. Producao usa HTTP, gRPC, fila ou equivalente.

Formato de recomendacao:

"Definir um ponto de encaixe, com adaptador HTTP em producao e adaptador em memoria nos testes, para manter a regra em um modulo profundo mesmo quando a execucao atravessa rede."

### 4. Externo real: mock

Servicos de terceiros que o projeto nao controla. O modulo recebe a dependencia por um ponto de encaixe. Testes usam mock.

## Disciplina de ponto de encaixe

- Um adaptador torna o ponto de encaixe hipotetico. Dois adaptadores tornam o ponto de encaixe real.
- Nao criar ponto de encaixe quando nada varia.
- Um modulo profundo pode ter pontos de encaixe internos usados por seus proprios testes, sem expor isso na interface externa.

## Estrategia de teste

- Trocar testes de modulos rasos por testes na interface do modulo aprofundado.
- A interface e a superficie de teste.
- Testar resultados observaveis, nao estado interno.
- Testes devem descrever comportamento. Se o teste precisa mudar quando a implementacao interna muda, ele esta atravessando a interface errada.
