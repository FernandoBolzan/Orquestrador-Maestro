# Memory Scopes

This document describes the memory scope system in Orquestrador Maestro.

## Scope Levels

### Repository Scope
- **Visibility**: All branches and worktrees in the repository
- **Use case**: Decisions, discoveries, and implementations that apply to the entire project
- **Example**: "Use TypeScript for the project", "Adopt JWT authentication"

### Branch Scope
- **Visibility**: Only the specific branch
- **Use case**: Branch-specific work, experiments, feature development
- **Example**: "Fixed login bug on feat-auth", "Added test coverage for API"

### Workspace Scope
- **Visibility**: Only the current worktree/checkout
- **Use case**: Worktree-specific local changes, temporary experiments
- **Example**: "Local debug session", "Workaround for build issue"

### Commit Scope
- **Visibility**: Tied to specific commit hash
- **Use case**: Commit-specific notes, temporary context
- **Example**: "Changed in commit abc123", "Reverted in def456"

### Task Scope
- **Visibility**: Tied to specific task ID
- **Use case**: Task-specific observations, cross-session continuity
- **Example**: "Refresh token fix progress", "API migration status"

## Visibility Matrix

| Observation Scope | Same Branch | Other Branch | Same Repo | Other Repo |
|-------------------|-------------|--------------|-----------|------------|
| Repository        | ✓           | ✓            | ✓         | ✗          |
| Branch            | ✓           | ✗*           | ✗         | ✗          |
| Workspace         | Current WS  | ✗            | ✗         | ✗          |
| Commit            | Ancestor    | Normally ✗   | Limited   | ✗          |
| Task              | Matching    | ✗            | ✗         | ✗          |

*Unless explicitly queried or promoted

## Branch Isolation

When working on branch `feat-a`:
- Repository-scoped observations: **visible**
- Branch `feat-a` observations: **visible**
- Branch `feat-b` observations: **hidden**

This prevents context leakage between parallel features.

## Worktree Isolation

Each worktree has a unique workspace ID:
- Repository ID remains the same
- Workspace ID changes per worktree
- Branch reflects the worktree's current branch
- HEAD points to the worktree's commit

## Promotion

Promotion moves observations from branch scope to repository scope:

```bash
# Dry-run (preview)
orquestrador-maestro memory promote --id obs_abc123 --destination DEV/DECISIONS.md

# Apply
orquestrador-maestro memory promote --id obs_abc123 --destination DEV/DECISIONS.md --apply
```

### Safe Destinations
- `DEV/CONTEXT.md`
- `DEV/DECISIONS.md`
- `DEV/ARCHITECTURE.md`
- `DEV/RUNBOOKS`

### Promotion Rules
1. Only verified observations can be promoted
2. Path traversal is blocked
3. Symlink escape is blocked
4. Destination must be within project root
5. Destination must be in safe destinations list

## Merge

When merging branches:
1. Branch-scoped observations remain on their original branch
2. Repository-scoped observations are shared
3. No automatic merging of branch observations
4. Manual promotion required for branch-specific insights

## Branch Deletion

When a branch is deleted:
1. Observations remain in the memory store
2. They become historical records
3. Searchable via explicit branch filter
4. No data loss, but no longer actively surfaced

## Rebase

After rebase:
1. Branch name remains the same
2. Commit hashes change
3. Observations tied to branch name persist
4. Observations tied to specific commits may become orphaned

## Detached HEAD

When HEAD is detached:
1. Branch resolves to "HEAD"
2. Repository identity remains valid
3. Workspace identity remains valid
4. Observations are still recorded
5. Scope defaults to repository level

## Precedence

Canonical documentation (DEV/) takes precedence over memory:
- Memory provides historical context
- Canonical files provide current truth
- Conflicts are resolved in favor of canonical
- Memory cannot silently override decisions

## CLI Examples

### Record with scope
```bash
# Repository scope (default)
orquestrador-maestro memory record --type decision --summary "Use React"

# Branch scope
orquestrador-maestro memory record --type discovery --summary "Found bug" --scope branch

# Workspace scope
orquestrador-maestro memory record --type implementation --summary "Fixed issue" --scope workspace
```

### Search with branch filter
```bash
# Search current branch only
orquestrador-maestro memory search --branch feat-a

# Search repository scope only
orquestrador-maestro memory search --scope repository
```

### View memory status
```bash
orquestrador-maestro memory status
```

Output:
```json
{
  "repository": "IAPro-Community/Orquestrador-Maestro",
  "repositoryId": "repo_abc123...",
  "branch": "feat/context-memory-benchmark",
  "head": "543b520...",
  "memory": {
    "repository": 4,
    "byType": { "decision": 2, "discovery": 1, "implementation": 1 },
    "verified": 3
  }
}
```
