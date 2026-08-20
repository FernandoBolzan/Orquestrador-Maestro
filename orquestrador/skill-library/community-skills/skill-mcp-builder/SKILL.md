---
name: skill-mcp-builder
description: Projeta e implementa MCP servers seguros, com schemas claros, autenticação mínima, tratamento de erros, testes e documentação operacional.
category: integrations
risk: high
source: orquestrador-native
---

# MCP Builder

Design tools around narrow, typed capabilities rather than exposing a raw shell or broad database.

## Checklist

- Define resources, tools, inputs, outputs, errors, pagination, and idempotency.
- Use least-privilege authentication and never log secrets.
- Validate every input and bound time, size, retries, and result volume.
- Separate read and write operations; require confirmation for consequential writes.
- Add unit tests, protocol/integration tests, timeout tests, and malformed-input tests.
- Document setup, environment variables, permissions, failure modes, and revocation.
- Run a quality-gate review before publishing or connecting the server.

Prefer official APIs and stable SDKs. Do not generate a tool that silently executes arbitrary commands.
