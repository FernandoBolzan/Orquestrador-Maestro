---
name: skill-web-clone
description: Clona uma página web a partir de uma URL, preservando estrutura visual, responsividade e interações essenciais com verificação por navegador.
category: frontend
risk: medium
source: codex-native-web-clone
---

# Skill Web Clone

Use esta skill quando o usuário pedir para clonar, reproduzir ou copiar um site a partir de uma URL. A referência principal deve ser uma página acessível ao navegador; uma captura de tela sozinha não substitui a extração da página.

## Fluxo

1. Confirme que a URL pertence ao usuário ou que existe autorização para reproduzi-la.
2. Use Playwright ou o MCP de navegador disponível para navegar, aguardar o carregamento e capturar o estado de acessibilidade.
3. Extraia somente a estrutura, estilos computados, conteúdo visível e elementos interativos necessários. Não replique APIs, autenticação, pagamentos, dados privados ou widgets de terceiros.
4. Implemente a página com HTML/CSS/JS ou com a stack existente do projeto, priorizando landmarks semânticos, tipografia, espaçamento, cores, responsividade e estados de interação.
5. Sirva a implementação localmente e valide estrutura, aparência e pelo menos duas interações detectadas na página original.
6. Corrija primeiro diferenças de layout e comportamento; repita a verificação até passar ou até cinco iterações.

## Guardrails

- O escopo padrão é uma única página.
- Use placeholders para imagens externas quando não houver autorização para copiá-las.
- Não invente equivalência de backend nem acesse áreas protegidas.
- Registre diferenças restantes e o resultado da verificação antes de declarar conclusão.

## Compatibilidade

Esta entrada canônica existe para que clientes compartilhados encontrem o nome `skill-web-clone`. No Codex nativo, o playbook detalhado continua disponível como `web-clone` em `.codex/skills`.
