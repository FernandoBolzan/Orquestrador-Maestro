$script = Join-Path (Join-Path $PSScriptRoot "..") "orquestrador\bin\check-dev-gates.js"
$node = Get-Command node -ErrorAction SilentlyContinue

if (-not $node) {
  throw "Node.js 18+ is required to run check-dev-gates."
}

& $node.Source $script @args
exit $LASTEXITCODE
