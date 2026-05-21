#!/bin/bash
set -e

# Orquestrador Maestro - Linux Install Verification
# Usage: ./verify-install.sh [--skip-tool-profiles]

HOME_PATH="$HOME"
SKIP_TOOL_PROFILES=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --skip-tool-profiles) SKIP_TOOL_PROFILES=true ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

ISSUES=()

function add_issue() {
    ISSUES+=("$1")
}

function assert_path() {
    local path="$1"
    local label="$2"
    if [ ! -e "$path" ]; then
        add_issue "$label missing: $path"
    fi
}

function assert_file_contains() {
    local path="$1"
    local pattern="$2"
    local label="$3"
    if [ ! -f "$path" ]; then return; fi
    if ! grep -q "$pattern" "$path"; then
        add_issue "$label does not include expected content: $path"
    fi
}

function count_dirs() {
    local path="$1"
    if [ ! -d "$path" ]; then echo 0; return; fi
    find "$path" -maxdepth 1 -type d -not -path "$path" | wc -l
}

function count_files() {
    local path="$1"
    if [ ! -d "$path" ]; then echo 0; return; fi
    find "$path" -maxdepth 1 -type f | wc -l
}

ORQUESTRADOR="$HOME_PATH/.orquestrador"
CODEX="$HOME_PATH/.codex"

assert_path "$ORQUESTRADOR/rules.md" "Orquestrador rules"
assert_path "$ORQUESTRADOR/maestro.md" "Orquestrador maestro"
assert_path "$ORQUESTRADOR/PROJECT_DEV_HIERARCHY.md" "Project DEV hierarchy"
assert_path "$ORQUESTRADOR/bin/init-project-dev.sh" "Project DEV initializer"
assert_path "$ORQUESTRADOR/SKILLS_INDEX.md" "Orquestrador skills index"
assert_path "$ORQUESTRADOR/SKILLS_ROUTER.json" "Orquestrador skills router"
assert_path "$ORQUESTRADOR/skills" "Orquestrador canonical skills"
assert_path "$HOME_PATH/AGENTS.md" "Global AGENTS.md"

assert_file_contains "$HOME_PATH/AGENTS.md" "DEV/" "Global AGENTS.md"
assert_file_contains "$HOME_PATH/AGENTS.md" "DEV/WORKLOG\.md" "Global AGENTS.md"
assert_file_contains "$ORQUESTRADOR/rules.md" "DEV/WORKLOG\.md" "Orquestrador rules"
assert_file_contains "$ORQUESTRADOR/PROJECT_DEV_HIERARCHY.md" "DEV/WORKLOG\.md" "Project DEV hierarchy"

assert_path "$CODEX/skills" "Codex skills"
assert_path "$CODEX/agents" "Codex agents"
assert_path "$CODEX/prompts" "Codex prompts"

COMPAT_ROOTS=(
    ".agents/skills"
    ".claude/skills"
    ".opencode/skills"
    ".cursor/skills"
    ".gemini/skills"
    ".windsurf/skills"
    ".antigravity-skills/skills"
)

for root in "${COMPAT_ROOTS[@]}"; do
    assert_path "$HOME_PATH/$root" "Compatibility skill root $root"
done

if [ "$SKIP_TOOL_PROFILES" = false ]; then
    assert_path "$HOME_PATH/.codex/AGENTS.md" "Codex AGENTS profile"
    assert_path "$HOME_PATH/.config/opencode/AGENTS.md" "OpenCode global AGENTS profile"
    assert_path "$HOME_PATH/.config/opencode/opencode.json" "OpenCode global config"
    assert_path "$HOME_PATH/.opencode/default-skill.json" "OpenCode default skill profile"
    assert_path "$HOME_PATH/.opencode/hooks.md" "OpenCode hooks profile"
    assert_path "$HOME_PATH/.claude/CLAUDE.md" "Claude global memory"
    assert_path "$HOME_PATH/.claude/hooks.md" "Claude hooks profile"
    assert_path "$HOME_PATH/.cursor/AGENTS.md" "Cursor AGENTS profile"
    assert_path "$HOME_PATH/.cursor/rules/orquestrador-maestro.mdc" "Cursor Orquestrador rule"
    assert_path "$HOME_PATH/.cursor/hooks.md" "Cursor hooks profile"
    assert_path "$HOME_PATH/.gemini/GEMINI.md" "Gemini global context"
    assert_path "$HOME_PATH/.gemini/hooks.md" "Gemini hooks profile"
    assert_path "$HOME_PATH/.codeium/windsurf/memories/global_rules.md" "Windsurf global rules"
    assert_path "$HOME_PATH/.windsurf/hooks.md" "Windsurf hooks profile"
    assert_path "$HOME_PATH/antigravity-rules.json" "Antigravity global rules"
    assert_path "$HOME_PATH/.antigravity/antigravity.json" "Antigravity integration config"
    assert_path "$HOME_PATH/.antigravity/settings.json" "Antigravity settings"
    assert_path "$HOME_PATH/.ai-standards/core/rules.md" "Antigravity AI standards rules"
    assert_path "$HOME_PATH/.ai-standards/core/workflow.md" "Antigravity AI standards workflow"

    assert_file_contains "$HOME_PATH/.codex/AGENTS.md" "DEV/WORKLOG\.md" "Codex AGENTS profile"
    assert_file_contains "$HOME_PATH/.config/opencode/AGENTS.md" "DEV/WORKLOG\.md" "OpenCode global AGENTS profile"
    assert_file_contains "$HOME_PATH/.claude/CLAUDE.md" "DEV/WORKLOG\.md" "Claude global memory"
    assert_file_contains "$HOME_PATH/.cursor/AGENTS.md" "DEV/WORKLOG\.md" "Cursor AGENTS profile"
    assert_file_contains "$HOME_PATH/.cursor/rules/orquestrador-maestro.mdc" "DEV/WORKLOG\.md" "Cursor Orquestrador rule"
    assert_file_contains "$HOME_PATH/.gemini/GEMINI.md" "DEV/WORKLOG\.md" "Gemini global context"
    assert_file_contains "$HOME_PATH/.codeium/windsurf/memories/global_rules.md" "DEV/WORKLOG\.md" "Windsurf global rules"
    assert_file_contains "$HOME_PATH/antigravity-rules.json" "\.ai-standards" "Antigravity global rules"
    assert_file_contains "$HOME_PATH/.antigravity/antigravity.json" "\.orquestrador" "Antigravity integration config"
    assert_file_contains "$HOME_PATH/.ai-standards/core/rules.md" "DEV/WORKLOG\.md" "Antigravity AI standards rules"

    OPENCODE_CONFIG="$HOME_PATH/.config/opencode/opencode.json"
    if [ -f "$OPENCODE_CONFIG" ]; then
        if ! grep -q "~/.orquestrador/rules.md" "$OPENCODE_CONFIG"; then
            add_issue "OpenCode global config does not include Orquestrador rules: $OPENCODE_CONFIG"
        fi
        if ! grep -q "~/.orquestrador/maestro.md" "$OPENCODE_CONFIG"; then
            add_issue "OpenCode global config does not include Orquestrador maestro: $OPENCODE_CONFIG"
        fi
    fi
fi

if [ ${#ISSUES[@]} -gt 0 ]; then
    echo "Install verification failed:"
    for issue in "${ISSUES[@]}"; do
        echo "  - $issue"
    done
    exit 1
fi

echo "Install verification passed."
echo "HomePath: $HOME_PATH"
echo "Orquestrador Skills: $(count_dirs "$ORQUESTRADOR/skills")"
echo "Codex Skills: $(count_dirs "$CODEX/skills")"
echo "Codex Agents: $(count_files "$CODEX/agents")"
echo "Codex Prompts: $(count_files "$CODEX/prompts")"
echo "Tool Profiles Checked: $((! SKIP_TOOL_PROFILES))"
