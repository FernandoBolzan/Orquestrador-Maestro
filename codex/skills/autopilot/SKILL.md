---
name: autopilot
description: Use when the user explicitly wants an autonomous, end-to-end software delivery workflow from an idea or brief to verified working code.
---

<Purpose>
Autopilot takes a sufficiently clear software brief and handles the full lifecycle: requirements analysis, technical design, planning, implementation, QA, review, recovery, and evidence-based handoff.
</Purpose>

<Use_When>
- User wants end-to-end autonomous execution from an idea to working code
- User says "autopilot", "auto pilot", "autonomous", "build me", "create me", "make me", "full auto", "handle it all", or "I want a/an..."
- Task requires multiple phases: planning, coding, testing, and validation
- User wants hands-off execution and is willing to let the system run to completion
</Use_When>

<Do_Not_Use_When>
- User wants to explore options or brainstorm -- use `plan` skill instead
- User says "just explain", "draft only", or "what would you suggest" -- respond conversationally
- User wants a single focused code change -- use `ralph` or delegate to an executor agent
- User wants to review or critique an existing plan -- use `plan --review`
- Task is a quick fix or small bug -- use direct executor delegation
</Do_Not_Use_When>

<Why_This_Exists>
Most non-trivial software tasks require coordinated phases: understanding requirements, designing a solution, implementing in parallel, testing, and validating quality. Autopilot orchestrates all of these phases automatically so the user can describe what they want and receive working code without managing each step.
</Why_This_Exists>

<Non_Negotiables>
- User instructions, repository instructions, and existing uncommitted work are binding context. Never overwrite unrelated user changes.
- Do not commit, push, merge, publish, deploy, delete, reset, or modify external systems unless the user explicitly authorizes that exact action.
- Inspect repository entrypoints and compact project memory before making assumptions. Prefer evidence from files and commands over remembered conventions.
- A claim of completion requires fresh evidence. A worker's self-report, a planned command, or code that merely looks right is not verification.
- Use only tools and skills available in the current runtime. If an optional tool is unavailable, use the closest local path and record the limitation.
- Every non-trivial automatic decision must be recorded with its evidence, rejected alternative, and cost if wrong.
</Non_Negotiables>

<Execution_Policy>
- Each phase must complete before the next begins
- Default to the lightest mode that can finish the task; do not expand into a heavy workflow unless the task truly needs multiple phases
- Parallel execution is used only for independent workstreams with clear ownership (Phase 2 and Phase 4)
- QA cycles repeat up to 5 times; if the same error persists 3 times, stop and report the fundamental issue
- Validation requires approval from all reviewers; rejected items get fixed and re-validated
- Cancel with `/cancel` at any time; progress is preserved for resume
- If a deep-interview spec exists, use it as high-clarity phase input instead of re-expanding from scratch
- If input is too vague for reliable expansion, offer/trigger `$deep-interview` first
- Do not enter expansion/planning/execution-heavy phases until pre-context grounding exists; if fast execution is forced, proceed only with explicit risk notes
- Default to concise, evidence-dense progress and completion reporting unless the user or risk level requires more detail
- Treat newer user task updates as local overrides for the active workflow branch while preserving earlier non-conflicting constraints
- If correctness depends on additional inspection, retrieval, execution, or verification, keep using the relevant tools until the workflow is grounded
- Continue through clear, low-risk, reversible next steps automatically; ask only when the next step is materially branching, destructive, or preference-dependent
- After compaction or resume, continue from the latest checkpoint and newest user message; do not restart discovery unless the checkpoint is missing or contradicted
- If the same diagnosis appears twice, make the next smallest safe fix or report the exact blocker; do not repeat the same investigation loop
- State MCP tools are helpful but optional; if an OMX MCP call fails, write a local checkpoint and continue instead of blocking
- Before changing code, define boundaries: files/behaviors that must not break, destructive commands that are forbidden, and the rollback point
- Every phase must have a gate: required artifact, owner, next action, and verification command; do not advance on vague outputs
- Prefer task-by-task execution with fresh context from checkpoint artifacts instead of relying on the full conversation history
- Treat autopilot as a bounded state machine: `intake -> expansion -> planning -> execution -> qa -> validation -> handoff`.
- A new user message is a local override. Preserve earlier non-conflicting requirements, invalidate affected downstream artifacts, and resume from the earliest invalid phase.
- Do not claim that unavailable reviewers approved anything. If review tools are missing, perform an adversarial single-agent review and disclose the limitation.
</Execution_Policy>

## Operating Modes

- `quick`: one compact plan, one implementation lane, one validation pass. Use for small, well-scoped work.
- `standard`: spec -> plan -> execute -> verify with focused artifacts and limited agents. Default mode.
- `deep`: multiple lanes, explicit boundaries, task graph, review team, and broader validation. Use only for large/risky work or explicit user request.

Autopilot should choose the smallest mode that can genuinely finish the task. The user can override with `quick`, `standard`, or `deep`.

## Persistent Artifacts

For non-trivial work, keep a compact artifact set under `.omx/autopilot/<task-slug>/`:

- `checkpoint.md`: current phase, root cause/hypothesis, files touched, next action, validation command.
- `boundaries.md`: do-not-break behavior, forbidden operations, secrets/production constraints, rollback point.
- `tasks.md`: task list with dependencies, ownership, parallel markers, and verification commands.
- `validation.md`: commands run, failures, fixes, final evidence.
- `survival-guide.md`: short handoff for compaction/restart with only the information needed to resume.

Keep artifacts short and update them at phase boundaries and before long repair loops.

## Phase Gates

Each phase must pass these gates before advancing:

- Artifact exists and names the next concrete action.
- Open questions are either answered, explicitly deferred, or converted into a safe assumption.
- Risk boundary is clear for files, data, secrets, billing, production, and destructive commands.
- Verification command is known, or the reason no command exists is written down.
- For parallel work, every lane has disjoint ownership or is sequenced.

<Steps>
0. **Pre-context Intake (required before Phase 0 starts)**:
   - Derive a task slug from the request.
   - Load the latest relevant snapshot from `.omx/context/{slug}-*.md` when available.
   - If this is a resumed or compacted conversation, read the newest local checkpoint before opening new files.
   - If no snapshot exists, create `.omx/context/{slug}-{timestamp}.md` (UTC `YYYYMMDDTHHMMSSZ`) with:
     - Task statement
     - Desired outcome
     - Known facts/evidence
     - Constraints
     - Unknowns/open questions
     - Likely codebase touchpoints
     - Current phase
     - Next concrete action
     - Validation command
   - Read applicable `AGENTS.md` files and, when present, compact `DEV/` files in order: `README`/`INDEX`, `HANDOFF`, `CONTEXT`, active spec. Load only task-relevant detail afterward.
   - Inspect branch/status/diff and record a baseline. Treat pre-existing changes as protected and choose a safe rollback point without destructive commands.
   - Identify stack, package manager, available test/build/lint/typecheck commands, entrypoints, and deployment/data boundaries.
   - Create or update `.omx/autopilot/{slug}/survival-guide.md` with only the context needed after compaction.
   - Create or update `.omx/autopilot/{slug}/boundaries.md` before code edits when the task is broad, risky, or production-facing.
   - If ambiguity remains high, run `explore` first for brownfield facts, then run `$deep-interview --quick <task>` before proceeding.
   - Carry the snapshot path into autopilot artifacts/state so all phases share grounded context.
   - Keep the checkpoint short enough to read quickly in a new session. The gate passes only when the next action, owner, risk boundary, and verification target are explicit.

1. **Phase 0 - Expansion**: Turn the user's idea into a detailed spec
   - If `.omx/specs/deep-interview-*.md` exists for this task: reuse it and skip redundant expansion work
   - If prompt is highly vague: route to `$deep-interview` for Socratic ambiguity-gated clarification
   - Analyst (THOROUGH tier): Extract requirements
   - Architect (THOROUGH tier): Create technical specification
   - Output: `.omx/plans/autopilot-spec.md`
   - Gate: spec lists acceptance criteria, non-goals, risk boundaries, assumptions, and a concrete evidence target for every criterion (or an explicit human-validation dependency)

2. **Phase 1 - Planning**: Create an implementation plan from the spec
   - Architect (THOROUGH tier): Create plan (direct mode, no interview)
   - Critic (THOROUGH tier): Validate plan
   - Output: `.omx/plans/autopilot-impl.md`
   - Break work into tasks with:
     - `id`
     - `owner`
     - `files/modules`
     - `dependsOn`
     - `parallelSafe: true|false`
      - `verify`
      - `acceptanceEvidence`
   - Mark independent work with `[P]` and explicit verification work with `[VERIFY]`
   - Before execution, check for contradictory tasks, overlapping ownership, missing dependencies, stale paths, unverifiable criteria, and commands with external side effects; record rulings.
   - Gate: every task has an owner, dependency decision, acceptance evidence, and verification command or evidence target

3. **Phase 2 - Execution**: Implement the plan with available execution workflows
   - LOW-tier executor/search roles: Simple tasks
   - STANDARD-tier executor roles: Standard tasks
   - THOROUGH-tier executor/architect roles: Complex tasks
   - Run independent tasks in parallel only when write ownership is disjoint, the integration point is clear, and each lane has an independent verification target. Shared interfaces, migrations, configuration, lockfiles, and generated files are sequential by default.
   - The lead agent keeps the critical path moving while side agents work
   - Before each long edit or test loop, update the checkpoint with changed files, current hypothesis, next action, and verification command
   - Execute tasks one-by-one unless `[P]` lanes are proven independent
   - For each task, use a fresh compact context: spec summary, relevant files, task definition, boundary notes, and verify command
   - The lead orchestrator should coordinate outputs and integration; avoid filling lead context with full file dumps that belong to specialist lanes

4. **Phase 3 - QA**: Verify in layers, then repair
   - Start with existence and relevance checks, then focused behavior checks, then integration/regression checks, and finally boundary checks for secrets, private paths, permissions, destructive operations, and generated output.
   - Build, lint, test, and fix failures when those checks exist; never invent a passing result for an unavailable command.
   - Repeat up to 5 cycles
   - Stop early if the same error repeats 3 times (indicates a fundamental issue)
   - Do not rerun broad tests blindly; after one broad failure, switch to the smallest failing test or command until fixed
   - For every failure, record root cause, changed hypothesis, smallest safe fix, covering check, and result. After one broad failure, switch to the smallest failing check before rerunning the broad gate.
   - Use layered gates:
     - existence: changed files and expected artifacts exist
     - relevance: changes address the requested behavior
     - root cause: failure explanation maps to code changed
     - regression: focused tests plus broad gate when available
     - momentum: next step is smaller than the previous loop
   - A gate may pass with an explicitly classified environmental, pre-existing, or unavailable check only when impact and next action are recorded; unresolved failures cannot be silently waived.

5. **Phase 4 - Validation**: Evidence-based independent review
   - Architect: Functional completeness
   - Security-reviewer: Vulnerability check
   - Code-reviewer: Quality review
   - Reviewers receive concise artifacts and diffs, not full session history
   - Review findings must include severity, file/path, and required action
   - Review the actual diff and evidence, not only worker reports.
   - Findings must include severity, path/symbol, evidence, and required action. Critical or important findings require a fix and scoped re-review; use one consolidated fix wave when findings share a cause.
   - After the validation cap, adjudicate each residual finding as fixed, deferred, or blocked with a reason. Do not silently convert disagreement into approval.
   - If reviewers or MCP tools are unavailable, perform a single-agent adversarial review and disclose that limitation.

6. **Phase 5 - Handoff and cleanup**: Clear only state owned by this run
   - `state_clear({mode: "autopilot"})`
   - `state_clear({mode: "ralph"})`
   - `state_clear({mode: "ultrawork"})`
   - `state_clear({mode: "ultraqa"})`
   - Or run `/cancel` for clean exit. Do not delete project artifacts or user changes as cleanup.
</Steps>

<Tool_Usage>
- Use available local tools, subagents, and MCP tools directly when present; do not block on discovery tooling that is unavailable in the current runtime.
- Give reviewers concise artifacts and the actual diff. Ask for severity, path/symbol, evidence, and required action; never pre-judge findings or ask a reviewer to ignore a risk.
- Agents form their own analysis first. Cross-validation is additive, not a substitute for tests or direct inspection.
- If a requested reviewer or MCP tool is unavailable, perform the closest local review and record the limitation instead of assuming approval.
</Tool_Usage>

## Token And Compaction Discipline

- Load router/index files before full catalogs or long references.
- Prefer file paths, symbols, and focused snippets over full file dumps.
- Summarize long command output immediately into the checkpoint instead of replaying it.
- Do not spawn agents to do the same search as the lead agent.
- Treat automatic compaction as a resume event, not a reason to restart the workflow.
- If context is getting large, finish the current fix/verification step before broadening scope.
- Keep a `survival-guide.md` current enough that a new session can continue without reading the raw conversation.

## Multiagent Discipline

- Use subagents only when the user explicitly asks or when independent lanes materially reduce time or risk.
- Assign each subagent a non-overlapping file/module/question scope.
- Require each subagent to return changed paths, commands run, findings, blockers, and residual risk.
- Keep integration, conflict resolution, and final validation with the lead agent.
- If agents would edit the same file, sequence the work instead of parallelizing it.
- Use specialist agents with single responsibilities; do not ask multiple agents to solve the same vague problem.

## Boundary Discipline

Before broad or risky execution, write boundaries:

- `NEVER`: destructive git commands, deleting user work, exposing secrets, unsafe production changes.
- `DANGER`: payments, auth, RLS, migrations, billing, customer data, cron jobs, external API side effects.
- `ROLLBACK`: current branch/status, backup path, or command needed to return to the pre-change state.
- `VERIFY`: the commands or manual evidence that prove the boundary was preserved.

## State Management

Use `omx_state` MCP tools for autopilot lifecycle state when available. The filesystem checkpoint and task ledger remain the source of truth when state tools are unavailable or fail.

- **On start**:
  `state_write({mode: "autopilot", active: true, current_phase: "expansion", started_at: "<now>", state: {context_snapshot_path: "<snapshot-path>"}})`
- **On phase transitions**:
  `state_write({mode: "autopilot", current_phase: "planning"})`
  `state_write({mode: "autopilot", current_phase: "execution"})`
  `state_write({mode: "autopilot", current_phase: "qa"})`
  `state_write({mode: "autopilot", current_phase: "validation"})`
- **On completion**:
  `state_write({mode: "autopilot", active: false, current_phase: "complete", completed_at: "<now>"})`
- **On cancellation/cleanup**:
  run `$cancel` (which should call `state_clear(mode="autopilot")`)


## Scenario Examples

**Good:** The user says `continue` after the workflow already has a clear next step. Continue the current branch of work instead of restarting or re-asking the same question.

**Good:** The user changes only the output shape or downstream delivery step (for example `make a PR`). Preserve earlier non-conflicting workflow constraints and apply the update locally.

**Bad:** The user says `continue`, and the workflow restarts discovery or stops before the missing verification/evidence is gathered.

<Examples>
<Good>
User: "autopilot A REST API for a bookstore inventory with CRUD operations using TypeScript"
Why good: Specific domain (bookstore), clear features (CRUD), technology constraint (TypeScript). Autopilot has enough context to expand into a full spec.
</Good>

<Good>
User: "build me a CLI tool that tracks daily habits with streak counting"
Why good: Clear product concept with a specific feature. The "build me" trigger activates autopilot.
</Good>

<Bad>
User: "fix the bug in the login page"
Why bad: This is a single focused fix, not a multi-phase project. Use direct executor delegation or ralph instead.
</Bad>

<Bad>
User: "what are some good approaches for adding caching?"
Why bad: This is an exploration/brainstorming request. Respond conversationally or use the plan skill.
</Bad>
</Examples>

<Escalation_And_Stop_Conditions>
- Stop and report when the same QA error persists across 3 cycles (fundamental issue requiring human input)
- Stop and report when validation keeps failing after 3 re-validation rounds
- Stop when the user says "stop", "cancel", or "abort"
- If requirements were too vague and expansion produces an unclear spec, pause and redirect to `$deep-interview` before proceeding
- Pause before deploy, publish, push, merge, delete, reset, production-data changes, account/auth changes, paid services, or third-party communication unless explicitly authorized.
- If a dependency, credential, service, or platform is unavailable, try a local substitute or static verification and report the limitation; never invent success.
- If the same diagnosis appears twice, change the hypothesis or report the blocker; do not repeat the same investigation loop.
</Escalation_And_Stop_Conditions>

<Final_Checklist>
- [ ] Request contract and risk boundaries are recorded
- [ ] Plan tasks have owners, dependencies, disjointness decisions, and verification targets
- [ ] Every changed behavior has focused evidence where feasible
- [ ] Required lint/typecheck/tests/build/package checks have fresh results, or limitations are explicit
- [ ] Review covers completeness, safety, and maintainability
- [ ] Residual findings and rulings are visible in the handoff
- [ ] No unauthorized commit, push, merge, publish, deploy, deletion, or external side effect occurred
- [ ] Checkpoint and applicable durable project memory are current
- [ ] User informed of outcome, evidence, limitations, and exact next action if needed
</Final_Checklist>

<Advanced>
## Configuration

Optional settings in `~/.codex/config.toml`:

```toml
[omx.autopilot]
maxIterations = 10
maxQaCycles = 5
maxValidationRounds = 3
pauseAfterExpansion = false
pauseAfterPlanning = false
skipQa = false
skipValidation = false
```

## Resume

If autopilot was cancelled or failed, run `/autopilot` again to resume from where it stopped.

## Recommended Clarity Pipeline

For ambiguous requests, prefer:

```
deep-interview -> ralplan -> autopilot
```

- `deep-interview`: ambiguity-gated Socratic requirements
- `ralplan`: consensus planning (planner/architect/critic)
- `autopilot`: execution + QA + validation

## Best Practices for Input

1. Be specific about the domain -- "bookstore" not "store"
2. Mention key features -- "with CRUD", "with authentication"
3. Specify constraints -- "using TypeScript", "with PostgreSQL"
4. Let it run -- avoid interrupting unless truly needed

## Pipeline Orchestrator (v0.8+)

Autopilot can be driven by the configurable pipeline orchestrator (`src/pipeline/`), which
sequences stages through a uniform `PipelineStage` interface:

```
RALPLAN (consensus planning) -> team-exec (Codex CLI workers) -> ralph-verify (architect verification)
```

Pipeline configuration options:

```toml
[omx.autopilot.pipeline]
maxRalphIterations = 10    # Ralph verification iteration ceiling
workerCount = 2            # Number of Codex CLI team workers
agentType = "executor"     # Agent type for team workers
```

The pipeline persists state via `pipeline-state.json` and supports resume from the last
incomplete stage. See `src/pipeline/orchestrator.ts` for the full API.

## Troubleshooting

**Stuck in a phase?** Check the active task list for blocked tasks, run `state_read({mode: "autopilot"})`, or cancel and resume.

**QA cycles exhausted?** The same error 3 times indicates a fundamental issue. Review the error pattern; manual intervention may be needed.

**Validation keeps failing?** Review the specific issues. Requirements may have been too vague -- cancel and provide more detail.
</Advanced>
