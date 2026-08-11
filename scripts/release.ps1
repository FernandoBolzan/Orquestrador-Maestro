[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^\d+\.\d+\.\d+$')]
  [string]$Version,

  [switch]$CreateTag,
  [switch]$PushTag
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if ($PushTag -and -not $CreateTag) {
  throw '-PushTag exige -CreateTag.'
}

$expectedTag = "v$Version"
$changelog = Get-Content -Raw -LiteralPath (Join-Path $repoRoot 'CHANGELOG.md')
$packageVersion = (node -p "require('./package.json').version").Trim()
$lockVersion = (node -p "require('./package-lock.json').version").Trim()
$lockRootVersion = (node -p "require('./package-lock.json').packages[''].version").Trim()

if ($packageVersion -ne $Version) {
  throw "package.json está na versão $packageVersion, mas o release solicitado é $Version."
}
if ($lockVersion -ne $Version -or $lockRootVersion -ne $Version) {
  throw "package-lock.json não está alinhado com a versão $Version."
}
if ($changelog -notmatch [regex]::Escape("## $Version - ") -and $changelog -notmatch [regex]::Escape("## $Version`n")) {
  throw "CHANGELOG.md não possui uma seção para a versão $Version."
}
if (git status --porcelain) {
  throw 'O working tree não está limpo. Faça commit ou remova alterações antes do release.'
}
if (git rev-parse --verify --quiet "refs/tags/$expectedTag") {
  throw "A tag $expectedTag já existe localmente."
}

Write-Host "Validando release $Version..."
npm run validate
npm pack --dry-run
git diff --check

if ($CreateTag) {
  git tag -a $expectedTag -m "Release $expectedTag"
  Write-Host "Tag $expectedTag criada localmente."
}

if ($PushTag) {
  git push origin $expectedTag
  Write-Host "Tag $expectedTag publicada no GitHub."
}

if (-not $CreateTag) {
  Write-Host "Validação concluída. Para criar a tag: .\scripts\release.ps1 -Version $Version -CreateTag"
}
