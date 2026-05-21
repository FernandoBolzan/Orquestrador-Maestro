#!/bin/bash
set -e

# Orquestrador Maestro - Project DEV Initializer
# Usage: ./init-project-dev.sh [project_path]

PROJECT_PATH="${1:-$(pwd)}"
PROJECT_ROOT=$(readlink -f "$PROJECT_PATH")
PROJECT_NAME=$(basename "$PROJECT_ROOT")
DEV_ROOT="$PROJECT_ROOT/DEV"

function write_text_file_if_missing() {
    local path="$1"
    local content="$2"

    if [ -e "$path" ]; then return 1; fi

    mkdir -p "$(dirname "$path")"
    echo -e "$content" > "$path"
    return 0
}

mkdir -p "$DEV_ROOT"

SUBDIRS=(
    "ADR" "API" "DATABASE" "LOGS" "SQL" "ARCH" "WORKFLOWS"
    "TESTS" "DOCUMENTATION" "BACKLOG" "RUNBOOKS" "TASKS"
    "RESEARCH" "HANDOFFS"
)

for subdir in "${SUBDIRS[@]}"; do
    mkdir -p "$DEV_ROOT/$subdir"
done

FILES=(
    "README.md|# DEV - {{PROJECT_NAME}}\n\nCompact operational documentation and project memory.\n\nStart with:\n\n1. \`INDEX.md\`\n2. \`CONTEXT.md\`\n3. The task-specific document\n\nDo not bulk-load the full \`DEV/\` folder by default."
    "INDEX.md|# DEV Index\n\n| Path | Purpose |\n|---|---|\n| \`README.md\` | Short operational documentation entrypoint |\n| \`CONTEXT.md\` | Current state, constraints, commands, and risks |\n| \`WORKLOG.md\` | Compact chronological hook of work done |\n| \`ARCHITECTURE.md\` | Living project architecture |\n| \`DECISIONS.md\` | Consolidated technical decisions |\n| \`ADR/\` | Formal decision records |\n| \`API/\` | API documentation |\n| \`DATABASE/\` | Data model, migrations, and data notes |\n| \`TESTING.md\` | Verification strategy and commands |\n| \`RUNBOOKS/\` | Operational procedures |\n| \`TASKS/\` | Active plans and tasks |\n| \`RESEARCH/\` | Research and references |\n| \`HANDOFFS/\` | Context handoffs |\n| \`LOGS/\` | Longer execution logs |\n| \`SQL/\` | SQL scripts and database work |\n| \`ARCH/\` | Existing architecture sub-hierarchy |\n| \`WORKFLOWS/\` | Active and completed workflow artifacts |\n| \`TESTS/\` | Existing testing sub-hierarchy |\n| \`DOCUMENTATION/\` | Existing project documentation sub-hierarchy |\n| \`BACKLOG/\` | Existing backlog and completed work archive |"
    "CONTEXT.md|# Current Context\n\n## State\n\n- Project: \`{{PROJECT_NAME}}\` \n- Update this file when commands, architecture, environment, risks, or active decisions change.\n\n## Commands\n\n- Install:\n- Development:\n- Tests:\n- Build:\n\n## Constraints And Risks\n\n- \n\n## Next Context\n\n- "
    "WORKLOG.md|# Worklog\n\nRecord a short summary here after substantive work.\n\n## Template\n\n\`\`\`text\n## YYYY-MM-DD - Short task title\n\n- Changed: paths or areas touched.\n- Why: one sentence.\n- Verified: command or manual check.\n- Next context: only what the next AI needs.\n\`\`\`"
    "ARCHITECTURE.md|# Architecture\n\nRecord the living project architecture, main components, integrations, and boundaries."
    "DECISIONS.md|# Decisions\n\nRecord consolidated technical decisions. Use \`ADR/\` for decisions that need more detail."
    "TESTING.md|# Testing And Verification\n\n## Commands\n\n- \n\n## Strategy\n\n- "
    "ROADMAP.md|# Roadmap\n\nUse this file for product or engineering direction when active planning exists."
)

CREATED_COUNT=0
for entry in "${FILES[@]}"; do
    IFS='|' read -r name content <<< "$entry"
    path="$DEV_ROOT/$name"
    final_content="${content//\{\{PROJECT_NAME\}\}/$PROJECT_NAME}"
    if write_text_file_if_missing "$path" "$final_content"; then
        ((CREATED_COUNT++))
    fi
done

echo "Project Path: $PROJECT_ROOT"
echo "Dev Path: $DEV_ROOT"
echo "Created Files: $CREATED_COUNT"
echo "Existing Files Preserved: $((${#FILES[@]} - CREATED_COUNT))"
