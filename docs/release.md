# Release

O release estável segue um único contrato: a versão do `package.json`, do `package-lock.json` e do `CHANGELOG.md` deve ser igual à tag anotada `vX.Y.Z`.

## Fluxo do mantenedor

1. Atualize os dois manifestos e crie a seção correspondente no `CHANGELOG.md`.
2. Faça commit dessas alterações no `main`.
3. Rode a checagem local:

   ```powershell
   .\scripts\release.ps1 -Version 0.1.20
   ```

4. Crie e envie a tag:

   ```powershell
   .\scripts\release.ps1 -Version 0.1.20 -CreateTag -PushTag
   ```

O script exige working tree limpo, verifica a versão dos manifestos, confere o changelog, executa `npm run validate`, gera a prévia do pacote e valida espaços inválidos.

## Publicação automática

O envio de uma tag `vX.Y.Z` dispara [`.github/workflows/release.yml`](../.github/workflows/release.yml). O workflow:

- confere se tag e pacote têm a mesma versão;
- exige a entrada correspondente no changelog;
- executa os gates de validação e `npm pack --dry-run`;
- publica no canal estável `latest` do npm com provenance.

Antes de usar o fluxo, configure o secret `NPM_TOKEN` no ambiente protegido `npm-release`, com permissão de publicação para `@iapro/orquestrador-maestro-cli`. Nunca reutilize uma versão já existente no npm.

## Rollback

Uma versão publicada no npm não deve ser sobrescrita. Em caso de problema, publique uma nova versão corrigida e, se necessário, use `npm deprecate` com uma mensagem objetiva. A tag GitHub permanece como registro imutável do artefato publicado.
