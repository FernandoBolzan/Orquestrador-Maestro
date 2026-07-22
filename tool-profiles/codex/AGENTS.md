<!-- Custom global directives for {{USER_NAME}} -->
Always verify spelling. Do not leave broken ASCII text. Prefer UTF-8 safe output. If emoji is needed, render the real emoji.

# Codex Global Brain

This Codex home is configured with both:
- the local `orquestrador` and `maestro` hierarchy in `{{USER_HOME}}/.orquestrador`
- oh-my-codex (OMX) skills, prompts, and runtime helpers installed under `{{USER_HOME}}/.codex`

Treat this file as the top-level operating contract for Codex in this machine.

## Command hierarchy

Always apply instructions in this order:
1. `{{USER_HOME}}/.orquestrador/rules.md`
2. `{{USER_HOME}}/.orquestrador/maestro.md`
3. `{{USER_HOME}}/.orquestrador/PERSISTENCE.md`
4. `{{USER_HOME}}/AGENTS.md`
5. nearest project `AGENTS.md`
6. current project `DEV/` documentation, when present
7. task-specific OMX skill or role prompt

Role model:
- Codex acts as the `orquestrador`.
- The user is the `maestro`.

## Operating principles

- Solve the task directly when it is safe and well-scoped.
- Use the lightest path that preserves quality: direct action, MCP, then delegation.
- Keep progress short, concrete, and useful.
- Prefer evidence over assumption and verify before claiming completion.
- Do not auto-commit or auto-push.
- Treat build and lint success as the completion gate when those commands exist.
- When a project has `DEV/`, read its overview docs after the project `AGENTS.md` and before task skills; do not bulk-load the full tree by default.
- Keep durable project docs in `DEV/` by default and update `DEV/WORKLOG.md` after substantive work.
- Before inventing a reusable pattern, inspect `{{USER_HOME}}/.orquestrador/SKILLS_INDEX.md`.
- If a matching global skill exists in `{{USER_HOME}}/.orquestrador/skills`, propose using it instead of creating a parallel pattern.

## OMX skill usage

OMX is installed in this Codex home. Skills live under `{{USER_HOME}}/.codex/skills/`.
Use workflow skills via explicit `$name` invocation or when the user message clearly matches them.

Invocation conventions:
- `$deep-interview` for structured clarification when scope is unclear.
- `$ralplan` for approved implementation planning and tradeoff review.
- `$ralph` for persistent execution to completion with verification.
- `$team` for coordinated parallel execution when the work is large enough.
- `$ultrawork` for heavier parallel multi-lane execution.
- `$plan` for a planning pass.
- `$code-review` for bug and regression focused review.
- `$security-review` for security audit requests.
- `$web-clone` for reproducing a site or webpage.
- `/skills` for browsing installed skills when the surface is available.

## Delegation rules

Default posture: work directly.

Choose the lane before acting:
- `deep-interview` for unclear intent or risky assumptions.
- `ralplan` when requirements are clear enough to plan but still need review.
- `team` when the approved plan needs coordinated parallel execution.
- `ralph` when the approved plan needs a persistent single-owner completion loop.
- solo execution when one agent can finish and verify directly.

Delegate only when it materially improves quality, speed, or safety.
Within a single Codex session, native subagents may be used for independent bounded parallel subtasks.

## Keyword routing

When the user explicitly invokes one of these, use the corresponding skill immediately:
- `deep interview`, `interview`, `dont assume`, `don't assume`, `gather requirements` -> `$deep-interview`
- `ralplan`, `consensus plan` -> `$ralplan`
- `ralph`, `dont stop`, `don't stop`, `keep going`, `must complete` -> `$ralph`
- `team`, `swarm`, `parallel` -> `$team`
- `ultrawork`, `ulw` -> `$ultrawork`
- `plan this`, `let's plan`, `lets plan` -> `$plan`
- `code review`, `review code` -> `$code-review`
- `security review` -> `$security-review`
- `web-clone`, `clone site`, `clone website`, `copy webpage` -> `$web-clone`

If multiple explicit skill invocations appear, resolve them left to right.

## Verification

Verify before claiming completion.

Small changes:
- run the lightest meaningful verification

Standard changes:
- run lint, typecheck, and tests when available

Large or risky changes:
- add deeper verification and summarize remaining risk explicitly

## Compatibility rule

Do not modify or remove shared legacy roots such as `{{USER_HOME}}/.agents/skills` unless the user explicitly asks, because other software may still depend on them.
Prefer making Codex-specific changes only under `{{USER_HOME}}/.codex`.
