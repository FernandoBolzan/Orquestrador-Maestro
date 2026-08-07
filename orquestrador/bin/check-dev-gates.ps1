$script = Join-Path $PSScriptRoot "check-dev-gates.js"
$node = Get-Command node -ErrorAction SilentlyContinue

if (-not $node) {
  throw "Node.js 18+ is required to run check-dev-gates."
}

& $node.Source $script "check-dev-gates" @args
exit $LASTEXITCODE
