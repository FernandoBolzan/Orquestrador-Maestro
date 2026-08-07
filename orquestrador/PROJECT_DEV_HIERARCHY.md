# Project DEV Hierarchy

`DEV/` is the canonical project documentation and operational memory root.

Use it to reduce token use across sessions: read compact control files first, then load only the task-relevant detail files.

## Required Files

Every project that uses this convention should keep:

- `DEV/README.md`: short project documentation entrypoint.
- `DEV/INDEX.md`: map of available project docs and what each file is for.
- `DEV/HANDOFF.md`: compact current snapshot for the next AI or human.
- `DEV/CONTEXT.md`: current project state, constraints, commands, and risks.
- `DEV/SPECS/ACTIVE.md`: active goal, scope, acceptance, and verification plan.
- `DEV/WORKLOG.md`: compact chronological hook of substantive work.
- `DEV/VERIFY.md`: latest verification evidence and outcomes.

## Recommended Sub-Hierarchy

Use these paths when relevant:

- `DEV/ARCHITECTURE.md`
- `DEV/DECISIONS.md`
- `DEV/ADR/`
- `DEV/API/`
- `DEV/DATABASE/`
- `DEV/TESTING.md`
- `DEV/RUNBOOKS/`
- `DEV/TASKS/`
- `DEV/ROADMAP.md`
- `DEV/RESEARCH/`
- `DEV/HANDOFFS/`
- `DEV/HANDOFFS/WORKLOG_ARCHIVE.md`

## Optional Phase State

`DEV/SPECS/ACTIVE.md` may also carry a lightweight phase state inside `## Status`:

- `Phase`: one of `discuss`, `plan`, `execute`, `verify`, `ship`, `handoff`.
- `Status`: short current state summary.
- `Next gate`: next concrete verification or handoff checkpoint.
- `Started at`: `YYYY-MM-DD` or an ISO-like timestamp.

These fields are optional. Legacy DEV projects without them remain valid. When present, `context brief` surfaces the current phase summary and `check-dev-gates` validates the structured fields.

## Compatible Existing Sub-Hierarchies

Many projects already use a richer DEV tree. Treat these as first-class compatible paths:

- `DEV/LOGS/`
- `DEV/SQL/`
- `DEV/ARCH/`
- `DEV/WORKFLOWS/`
- `DEV/TESTS/`
- `DEV/DOCUMENTATION/`
- `DEV/BACKLOG/`

Do not rename or move existing DEV docs just to match the recommended names. Add or update `DEV/INDEX.md` so agents can map the current project layout quickly.

## Read Order

When entering a project:

1. Read the nearest project `AGENTS.md`, when present.
2. Read `DEV/README.md` or `DEV/INDEX.md`.
3. Read `DEV/HANDOFF.md`.
4. Read `DEV/CONTEXT.md`.
5. Read `DEV/SPECS/ACTIVE.md`.
6. Open only the detail files relevant to the task.
7. Open `DEV/WORKLOG.md` only when the handoff or spec is not enough.
8. Select global skills after project context is understood.

Do not bulk-load the full `DEV/` tree by default.

## Write Hook

After any substantive project work, update:

- `DEV/WORKLOG.md` with one compact entry.
- `DEV/VERIFY.md` with the latest checks.
- `DEV/HANDOFF.md` with the next-session snapshot.
- `DEV/SPECS/ACTIVE.md` when scope, acceptance, or status changes.

Each worklog entry should stay small:

```text
## YYYY-MM-DD - Short task title

- Spec: `DEV/SPECS/ACTIVE.md` or equivalent task doc
- Changed: paths or areas touched
- Why: one sentence
- Verified: command or manual check
- Risks: only active risks
- Next context: only what the next AI needs
```

Also update:

- `DEV/INDEX.md` when a DEV doc is created, renamed, or removed.
- `DEV/CONTEXT.md` when project assumptions, commands, architecture, environment, or risks change.
- The relevant detail file when a durable decision or project fact changes.

## Worklog Control

`DEV/WORKLOG.md` should not become a long transcript.

Use the helpers below:

- `orquestrador-maestro compact-worklog --project-path <project> --keep 12`
- `orquestrador-maestro check-dev-gates --project-path <project> --max-entries 12 --strict`

`compact-worklog` keeps only the most recent entries in `DEV/WORKLOG.md`, archives older entries into `DEV/HANDOFFS/WORKLOG_ARCHIVE.md`, and refreshes `DEV/HANDOFF.md`.

`check-dev-gates` verifies that the spec, handoff, verify, context, and worklog structure are present and still compact enough to avoid context sprawl. When structured phase state is present, it also validates the phase fields and prints concrete corrective actions. Legacy handoff/spec/verify formats remain accepted when the structured fields are absent.

## Documentation Placement

Create durable project documentation under `DEV/` by default.

If the user asks for a public-facing file outside `DEV/`, such as root `README.md` or product docs, keep the operational context, decision, and maintenance note in `DEV/` as well.

Do not paste long logs, full diffs, dependency dumps, or generated output into `DEV/`. Link to paths and summarize the result.
