[CmdletBinding()]
param(
    [string]$RepoPath = (Get-Location).Path,
    [string]$OutputPath = "security-reports",
    [switch]$RunStrix,
    [string]$StrixTarget,
    [switch]$Authorized
)

$ErrorActionPreference = "Stop"
$resolvedRepo = (Resolve-Path -LiteralPath $RepoPath).Path
$resolvedOutput = Join-Path $resolvedRepo $OutputPath
New-Item -ItemType Directory -Force -Path $resolvedOutput | Out-Null

function Test-Tool([string]$Name) { return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue) }
function Invoke-Scanner([string]$Name, [scriptblock]$Action) {
    $logPath = Join-Path $resolvedOutput "$Name.log"
    Write-Host "[security] $Name"
    try {
        & $Action 2>&1 | Tee-Object -FilePath $logPath
        if ($LASTEXITCODE -ne 0) { Write-Warning "$Name retornou código $LASTEXITCODE; revise $logPath" }
    } catch {
        Write-Warning "$Name falhou: $($_.Exception.Message)"
        $_ | Out-File -FilePath $logPath -Encoding utf8
    }
}

Push-Location $resolvedRepo
try {
    if (Test-Tool "gitleaks") { Invoke-Scanner "gitleaks" { gitleaks dir --redact --report-format sarif --report-path (Join-Path $resolvedOutput "gitleaks.sarif") $resolvedRepo } } else { Write-Warning "gitleaks não está instalado; etapa ignorada." }
    if (Test-Tool "semgrep") { Invoke-Scanner "semgrep" { semgrep scan --config p/owasp-top-ten --sarif --output (Join-Path $resolvedOutput "semgrep.sarif") $resolvedRepo } } else { Write-Warning "semgrep não está instalado; etapa ignorada." }
    if (Test-Tool "osv-scanner") { Invoke-Scanner "osv-scanner" { osv-scanner scan source --format sarif --output (Join-Path $resolvedOutput "osv.sarif") --recursive $resolvedRepo } } else { Write-Warning "osv-scanner não está instalado; etapa ignorada." }
    if (Test-Tool "trivy") { Invoke-Scanner "trivy" { trivy fs --scanners vuln,secret,misconfig --format sarif --output (Join-Path $resolvedOutput "trivy.sarif") $resolvedRepo } } else { Write-Warning "trivy não está instalado; etapa ignorada." }
    if ($RunStrix) {
        if (-not $Authorized) { throw "Strix exige -Authorized para evitar testes fora de escopo." }
        if ([string]::IsNullOrWhiteSpace($StrixTarget)) { throw "Informe -StrixTarget com um diretório ou URL autorizado." }
        if (-not (Test-Tool "strix")) { throw "Strix não está instalado; consulte a documentação oficial." }
        Invoke-Scanner "strix" { strix -n --target $StrixTarget --scan-mode standard }
    }
} finally { Pop-Location }
Write-Host "Relatórios gravados em $resolvedOutput"
