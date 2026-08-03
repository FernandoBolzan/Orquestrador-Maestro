#!/usr/bin/env bash
set -u

repo_path="$(pwd)"
output_path="security-reports"
run_strix="false"
strix_target=""
authorized="false"

usage() { echo "Uso: scripts/security-scan.sh [--repo PATH] [--output PATH] [--run-strix --target TARGET --authorized]"; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo) repo_path="$2"; shift 2 ;;
    --output) output_path="$2"; shift 2 ;;
    --run-strix) run_strix="true"; shift ;;
    --target) strix_target="$2"; shift 2 ;;
    --authorized) authorized="true"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Opção desconhecida: $1" >&2; usage; exit 2 ;;
  esac
done

repo_path="$(cd "$repo_path" && pwd)"
report_dir="$repo_path/$output_path"
mkdir -p "$report_dir"

run_scanner() {
  name="$1"; shift
  echo "[security] $name"
  "$@" 2>&1 | tee "$report_dir/$name.log" || echo "[security] $name retornou código não zero; revise o log." >&2
}

cd "$repo_path"
command -v gitleaks >/dev/null 2>&1 && run_scanner gitleaks gitleaks dir --redact --report-format sarif --report-path "$report_dir/gitleaks.sarif" "$repo_path" || echo "[security] gitleaks não está instalado; etapa ignorada."
command -v semgrep >/dev/null 2>&1 && run_scanner semgrep semgrep scan --config p/owasp-top-ten --sarif --output "$report_dir/semgrep.sarif" "$repo_path" || echo "[security] semgrep não está instalado; etapa ignorada."
command -v osv-scanner >/dev/null 2>&1 && run_scanner osv-scanner osv-scanner scan source --format sarif --output "$report_dir/osv.sarif" --recursive "$repo_path" || echo "[security] osv-scanner não está instalado; etapa ignorada."
command -v trivy >/dev/null 2>&1 && run_scanner trivy trivy fs --scanners vuln,secret,misconfig --format sarif --output "$report_dir/trivy.sarif" "$repo_path" || echo "[security] trivy não está instalado; etapa ignorada."

if [[ "$run_strix" == "true" ]]; then
  [[ "$authorized" == "true" ]] || { echo "Strix exige --authorized." >&2; exit 2; }
  [[ -n "$strix_target" ]] || { echo "Informe --target." >&2; exit 2; }
  command -v strix >/dev/null 2>&1 || { echo "Strix não está instalado." >&2; exit 2; }
  run_scanner strix strix -n --target "$strix_target" --scan-mode standard
fi

echo "Relatórios gravados em $report_dir"
