#!/bin/bash
set -e

# Orquestrador Maestro - Skill Synchronizer
# Usage: ./sync-skills.sh [--apply] [--home-path /path/to/home]

APPLY=false
HOME_PATH="$HOME"

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --apply) APPLY=true ;;
        --home-path) HOME_PATH="$2"; shift ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

SOURCES=(
    "$HOME_PATH/.orquestrador/skills"
    "$HOME_PATH/.global-skills"
    "$HOME_PATH/.codex/skills"
)

TARGETS=(
    "$HOME_PATH/.codex/skills"
    "$HOME_PATH/.opencode/skills"
    "$HOME_PATH/.agents/skills"
    "$HOME_PATH/.claude/skills"
    "$HOME_PATH/.cursor/skills"
    "$HOME_PATH/.gemini/skills"
    "$HOME_PATH/.windsurf/skills"
    "$HOME_PATH/.antigravity-skills/skills"
)

MUST_HAVE=(
    "skill-saas-factory" "skill-saas-admin-dashboard" "skill-abacatepay-integration"
    "skill-stripe-integration" "skill-saas-core-limits" "skill-supabase-rls"
    "skill-saas-security-scan" "skill-saas-dast-recon" "skill-security-hooks"
    "skill-ai-orchestration" "skill-multiagent-orchestration" "skill-aionui-cowork-orchestration"
    "skill-evolution-api" "skill-frontend-ux-guardrails" "skill-modern-ui-patterns"
    "skill-open-design-ui" "skill-live-processing" "skill-manual-video-processing"
    "skill-smart-clip-detection" "skill-unified-analytics" "skill-elevenlabs-voice-cloning"
    "skill-google-workspace-sync"
)

function get_skill_source() {
    local name="$1"
    for root in "${SOURCES[@]}"; do
        local candidate="$root/$name"
        if [ -f "$candidate/SKILL.md" ]; then
            echo "$candidate"
            return 0
        fi
    done
    return 1
}

echo -e "Target\tSkill\tStatus\tAction"
for target in "${TARGETS[@]}"; do
    target_exists=false
    [ -d "$target" ] && target_exists=true
    
    for skill in "${MUST_HAVE[@]}"; do
        src=$(get_skill_source "$skill" || true)
        dest="$target/$skill"
        exists=false
        [ -f "$dest/SKILL.md" ] && exists=true
        
        status="ok"
        action="none"
        
        if [ -z "$src" ]; then
            status="missing-source"
        elif [ "$target_exists" = false ]; then
            status="missing-target"
        elif [ "$exists" = false ]; then
            status="missing"
            action="copy"
        else
            # Simple check: if source SKILL.md is newer than dest
            if [ "$src/SKILL.md" -nt "$dest/SKILL.md" ]; then
                status="outdated"
                action="update"
            fi
        fi
        
        if [ "$APPLY" = true ] && [[ "$action" == "copy" || "$action" == "update" ]]; then
            mkdir -p "$target"
            rm -rf "$dest"
            cp -r "$src" "$dest"
            action="done"
        fi
        
        echo -e "$target\t$skill\t$status\t$action"
    done
done
