#!/bin/bash
set -e

# Orquestrador Maestro - Linux Installer Wrapper
# Usage: ./install.sh [--no-force] [--no-tool-profiles] [--core-only] [--skip-community-skills] [--skip-skill-sync]

HOME_PATH="$HOME"
FORCE=true
TOOL_PROFILES=true
CORE_ONLY=false
SKIP_COMMUNITY_SKILLS=false
SKIP_SKILL_SYNC=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --no-force) FORCE=false ;;
        --no-tool-profiles) TOOL_PROFILES=false ;;
        --core-only) CORE_ONLY=true ;;
        --skip-community-skills) SKIP_COMMUNITY_SKILLS=true ;;
        --skip-skill-sync) SKIP_SKILL_SYNC=true ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

ENGINE="$(dirname "$0")/scripts/install.sh"

if [ ! -f "$ENGINE" ]; then
    echo "Error: Missing installer engine: $ENGINE"
    exit 1
fi

ARGS=()
[ "$FORCE" = true ] && ARGS+=("--force")
[ "$TOOL_PROFILES" = true ] && [ "$CORE_ONLY" = false ] && ARGS+=("--install-tool-profiles")
[ "$CORE_ONLY" = true ] && ARGS+=("--skip-extra-skills")
[ "$SKIP_COMMUNITY_SKILLS" = true ] && ARGS+=("--skip-community-skills")
[ "$SKIP_SKILL_SYNC" = true ] && ARGS+=("--skip-skill-sync")

bash "$ENGINE" "${ARGS[@]}"
exit $?
