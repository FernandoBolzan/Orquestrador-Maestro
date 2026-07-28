# Contribuindo

Obrigado por ajudar o Orquestrador Maestro. Este repositório é público, instalável e sanitizado; a contribuição precisa preservar essas três propriedades.

## Escopo Do Projeto

O projeto mantém:

- instaladores Windows, Linux e macOS;
- CLI npm `@iapro/orquestrador-maestro-cli`;
- núcleo `orquestrador/` com regras, Maestro, hooks, roteadores e skills canônicas;
- perfis de ferramentas para Codex, Claude Code, OpenCode, Cursor, Gemini CLI, Windsurf e Antigravity;
- documentação da hierarquia `DEV/` para projetos;
- validação para impedir publicação de dados privados.

## Antes De Abrir PR

Rode os gates principais:

```powershell
npm run validate
npm run audit
npm pack --dry-run
git diff --check
```

Se você alterou scripts Bash, rode também uma checagem de sintaxe no ambiente disponível:

```bash
bash -n install.sh
bash -n scripts/install.sh
bash -n scripts/verify-install.sh
```

## Segurança E Privacidade

Não envie:

- tokens, chaves, cookies, recovery codes, `.env` ou credenciais;
- logs, caches, sessões, memórias locais, backups ou histórico de execução;
- caminhos reais de usuário;
- conteúdo da pasta `DEV/` local;
- prints contendo telefone, e-mail privado, conversas ou dados pessoais.

Use placeholders como `%USERPROFILE%`, `$HOME`, `{{USER_HOME}}`, `{{USER_NAME}}` e `{{USER_FULL_NAME}}`.

## Fluxo Recomendado

1. Abra uma issue ou descreva claramente o problema no PR.
2. Para mudanças que afetem arquitetura, memória, privacidade, compatibilidade ou mais de uma ferramenta, abra uma RFC em [`docs/rfcs/`](docs/rfcs/README.md).
3. Faça a menor mudança que resolve o caso.
4. Atualize README ou docs quando o comportamento público mudar.
5. Atualize `CHANGELOG.md` e o resumo do changelog no README quando a mudança for relevante para usuários.
6. Rode validação.
7. Explique no PR: o que mudou, por que mudou, como foi verificado e risco restante.

## Contribuições De Skills

Skills canônicas ficam em `orquestrador/skills/`. Use os scripts de criação quando possível:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\new-canonical-skill.ps1 -Name "skill-exemplo" -Description "Use for ..." -Category "general" -Risk "low"
```

Depois valide:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-skills.ps1
```

Não edite apenas os espelhos em `.codex`, `.claude`, `.opencode`, `.cursor`, `.gemini`, `.windsurf` ou `.agents`. A fonte canônica deve ser atualizada primeiro.

## Padrão De Changelog

O histórico canônico fica em `CHANGELOG.md`. O `README.md` mantém o resumo rápido e a data da revisão pública mais recente para quem está avaliando a atualização antes de instalar.

Use em `CHANGELOG.md`:

```text
### x.y.z - YYYY-MM-DD

- Added: novo recurso, arquivo ou fluxo.
- Changed: alteração de comportamento, documentação ou compatibilidade.
- Fixed: correção de bug, instalação, validação ou texto.
- Security: melhoria de privacidade, sanitização, dependência ou validação.
- Migration: ação necessária para quem já usa o Orquestrador.
```

Mudanças já mergeadas, mas ainda não publicadas no npm, devem ficar em `## Unreleased`. Quando houver publish, renomeie a seção para a próxima versão semver e alinhe `package.json`.

## Licenças E Referências

Não copie código, texto ou assets de outros repositórios sem confirmar licença compatível. Para referências externas, prefira documentar o padrão extraído e criar implementação própria.
