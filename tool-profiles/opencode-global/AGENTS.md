# OpenCode Global Orquestrador

Use this file as the global OpenCode rule file for this user.

Always apply the Orquestrador Maestro contract:

1. Read `{{USER_HOME}}/AGENTS.md`.
2. Read `{{USER_HOME}}/.orquestrador/rules.md`.
3. Read `{{USER_HOME}}/.orquestrador/maestro.md`.
4. Read `{{USER_HOME}}/.orquestrador/PERSISTENCE.md`.
5. In projects with `DEV/`, read the project DEV overview after the nearest project `AGENTS.md`.
6. Use `{{USER_HOME}}/.orquestrador/SKILLS_ROUTER.json` before loading task skills.
7. Load only the task-relevant `SKILL.md` files and task-relevant `DEV/` docs.
8. Keep durable project docs in `DEV/` by default and update `DEV/WORKLOG.md` after substantive work.
9. Treat the IA as `orquestrador` and the user as `maestro`.
10. Verify before claiming completion.
11. Do not commit or push unless the user explicitly asks.

Default skill: `orquestrador-maestro`.
