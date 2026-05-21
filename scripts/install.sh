#!/bin/bash
set -e

# Orquestrador Maestro - Linux Installer Engine
# Usage: ./install.sh [--force] [--skip-skill-sync] [--skip-extra-skills] [--skip-community-skills] [--install-tool-profiles]

HOME_PATH="$HOME"
FORCE=false
SKIP_SKILL_SYNC=false
SKIP_EXTRA_SKILLS=false
SKIP_COMMUNITY_SKILLS=false
INSTALL_TOOL_PROFILES=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --force) FORCE=true ;;
        --skip-skill-sync) SKIP_SKILL_SYNC=true ;;
        --skip-extra-skills) SKIP_EXTRA_SKILLS=true ;;
        --skip-community-skills) SKIP_COMMUNITY_SKILLS=true ;;
        --install-tool-profiles) INSTALL_TOOL_PROFILES=true ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE_ORQUESTRADOR="$REPO_ROOT/orquestrador"
SOURCE_AGENTS="$REPO_ROOT/home/AGENTS.md"
SOURCE_CODEX="$REPO_ROOT/codex"
SOURCE_COMMUNITY_SKILLS="$REPO_ROOT/skill-library/community-skills"
SOURCE_TOOL_PROFILES="$REPO_ROOT/tool-profiles"

TARGET_ORQUESTRADOR="$HOME_PATH/.orquestrador"
TARGET_AGENTS="$HOME_PATH/AGENTS.md"
BACKUP_ROOT="$HOME_PATH/.orquestrador-public-backups"
STAMP=$(date +"%Y%m%d-%H%M%S")
BACKUP_DIR="$BACKUP_ROOT/$STAMP"

USER_NAME=$(basename "$HOME_PATH")

function is_text_file() {
    local file="$1"
    local ext="${file##*.}"
    local leaf=$(basename "$file")
    
    if [[ "$leaf" == ".gitignore" ]]; then return 0; fi
    if [[ "$ext" == "$file" ]]; then return 0; fi # No extension

    case "$ext" in
        md|mdc|txt|json|jsonl|toml|yaml|yml|ps1|cmd|sh|js|jsx|ts|tsx|mjs|cjs|py|rb|go|rs|java|kt|swift|c|h|cpp|hpp|cs|html|css|scss|svg|xsd|xml|csv|patch|template|rules|ini|cfg|conf|sql)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

function copy_with_placeholders() {
    local src="$1"
    local dest="$2"
    mkdir -p "$(dirname "$dest")"

    if is_text_file "$src"; then
        # Use sed to replace placeholders. 
        # {{USER_HOME}} -> $HOME_PATH
        # {{USER_NAME}} -> $USER_NAME
        # {{USER_FULL_NAME}} -> $USER_NAME
        sed -e "s|{{USER_HOME}}|$HOME_PATH|g" \
            -e "s|{{USER_NAME}}|$USER_NAME|g" \
            -e "s|{{USER_FULL_NAME}}|$USER_NAME|g" \
            "$src" > "$dest"
    else
        cp "$src" "$dest"
    fi
}

function copy_tree_with_placeholders() {
    local src_dir="$1"
    local dest_dir="$2"
    
    find "$src_dir" -type f | while read -r src_file; do
        local relative_path="${src_file#$src_dir/}"
        local dest_file="$dest_dir/$relative_path"
        copy_with_placeholders "$src_file" "$dest_file"
    done
}

function backup_path() {
    local path="$1"
    local label="$2"
    if [ -e "$path" ]; then
        mkdir -p "$BACKUP_DIR"
        local dest="$BACKUP_DIR/$label"
        cp -r "$path" "$dest"
    fi
}

# Validation
if [ ! -d "$SOURCE_ORQUESTRADOR" ]; then
    echo "Error: Missing generated snapshot: $SOURCE_ORQUESTRADOR"
    exit 1
fi
if [ ! -f "$SOURCE_AGENTS" ]; then
    echo "Error: Missing home AGENTS template: $SOURCE_AGENTS"
    exit 1
fi

if [ -e "$TARGET_ORQUESTRADOR" ] && [ "$FORCE" = false ]; then
    echo "Error: Target already exists: $TARGET_ORQUESTRADOR. Re-run with --force to overwrite after backup."
    exit 1
fi
if [ -e "$TARGET_AGENTS" ] && [ "$FORCE" = false ]; then
    echo "Error: Target already exists: $TARGET_AGENTS. Re-run with --force to overwrite after backup."
    exit 1
fi

# Prepare targets
declare -A EXTRA_TARGETS
declare -A EXTRA_FILE_TARGETS

if [ "$SKIP_EXTRA_SKILLS" = false ]; then
    if [ "$SKIP_COMMUNITY_SKILLS" = false ] && [ -d "$SOURCE_COMMUNITY_SKILLS" ]; then
        COMMUNITY_ROOTS=(
            ".codex/skills"
            ".agents/skills"
            ".claude/skills"
            ".opencode/skills"
            ".cursor/skills"
            ".gemini/skills"
            ".windsurf/skills"
            ".antigravity-skills/skills"
        )
        for root in "${COMMUNITY_ROOTS[@]}"; do
            EXTRA_TARGETS["$HOME_PATH/$root"]="$SOURCE_COMMUNITY_SKILLS|${root//\//__}"
        done
    fi
    EXTRA_TARGETS["$HOME_PATH/.codex/skills"]="$SOURCE_CODEX/skills|.codex__skills"
    EXTRA_TARGETS["$HOME_PATH/.codex/agents"]="$SOURCE_CODEX/agents|.codex__agents"
    EXTRA_TARGETS["$HOME_PATH/.codex/prompts"]="$SOURCE_CODEX/prompts|.codex__prompts"
fi

if [ "$INSTALL_TOOL_PROFILES" = true ]; then
    TOOL_PROFILES=(
        "codex|.codex|.codex__profile"
        "opencode|.opencode|.opencode"
        "opencode-global|.config/opencode|.config__opencode"
        "claude|.claude|.claude"
        "cursor|.cursor|.cursor"
        "gemini|.gemini|.gemini"
        "windsurf|.windsurf|.windsurf"
        "windsurf-global|.codeium/windsurf/memories|.codeium__windsurf__memories"
        "antigravity|.antigravity|.antigravity"
        "ai-standards|.ai-standards|.ai-standards"
    )
    for entry in "${TOOL_PROFILES[@]}"; do
        IFS='|' read -r src_sub dest_sub label <<< "$entry"
        EXTRA_TARGETS["$HOME_PATH/$dest_sub"]="$SOURCE_TOOL_PROFILES/$src_sub|$label"
    done

    EXTRA_FILE_TARGETS["$HOME_PATH/antigravity-rules.json"]="$SOURCE_TOOL_PROFILES/antigravity-home/antigravity-rules.json|antigravity-rules.json"
fi

# Backup
backup_path "$TARGET_ORQUESTRADOR" ".orquestrador"
backup_path "$TARGET_AGENTS" "AGENTS.md"

for dest in "${!EXTRA_TARGETS[@]}"; do
    IFS='|' read -r src label <<< "${EXTRA_TARGETS[$dest]}"
    backup_path "$dest" "$label"
done

for dest in "${!EXTRA_FILE_TARGETS[@]}"; do
    IFS='|' read -r src label <<< "${EXTRA_FILE_TARGETS[$dest]}"
    backup_path "$dest" "$label"
done

# Install
if [ -d "$TARGET_ORQUESTRADOR" ]; then
    rm -rf "$TARGET_ORQUESTRADOR"
fi

copy_tree_with_placeholders "$SOURCE_ORQUESTRADOR" "$TARGET_ORQUESTRADOR"
copy_with_placeholders "$SOURCE_AGENTS" "$TARGET_AGENTS"
mkdir -p "$TARGET_ORQUESTRADOR/logs"

for dest in "${!EXTRA_TARGETS[@]}"; do
    IFS='|' read -r src label <<< "${EXTRA_TARGETS[$dest]}"
    if [ -d "$src" ]; then
        mkdir -p "$dest"
        copy_tree_with_placeholders "$src" "$dest"
    fi
done

for dest in "${!EXTRA_FILE_TARGETS[@]}"; do
    IFS='|' read -r src label <<< "${EXTRA_FILE_TARGETS[$dest]}"
    if [ -f "$src" ]; then
        copy_with_placeholders "$src" "$dest"
    fi
done

# Sync Skills (Simplified for Linux)
if [ "$SKIP_SKILL_SYNC" = false ]; then
    SYNC_SCRIPT="$TARGET_ORQUESTRADOR/sync-skills.sh"
    if [ -f "$SYNC_SCRIPT" ]; then
        bash "$SYNC_SCRIPT" --apply --home-path "$HOME_PATH"
    else
        echo "Note: sync-skills.sh not found, skipping sync."
    fi
fi

echo "Installation complete."
echo "HomePath: $HOME_PATH"
echo "Installed Orquestrador: $TARGET_ORQUESTRADOR"
echo "Installed AGENTS: $TARGET_AGENTS"
[ -d "$BACKUP_DIR" ] && echo "Backup: $BACKUP_DIR"
