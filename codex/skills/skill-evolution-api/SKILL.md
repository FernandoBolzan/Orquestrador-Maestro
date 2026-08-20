---
name: skill-evolution-api
description: Use for WhatsApp automation with Evolution API, including instance lifecycle, QR pairing, inbound and outbound messages, webhooks, consent, tenant isolation, queues, idempotency, rate limits, retries, audit logs, and reliable delivery.
category: communication
risk: medium
source: evolution-api-local-patterns
last_verified: 2026-08-06
---

# Evolution API

Use this skill when integrating WhatsApp through Evolution API. Treat every message as sensitive customer communication.

## Core Workflow

1. Confirm the tenant, WhatsApp account owner, business purpose, user consent model, and allowed message categories.
2. Keep Evolution API keys, webhook secrets, and instance credentials server-side only.
3. Model each instance as tenant-owned state with lifecycle, QR pairing state, webhook status, heartbeat, and disconnect reason.
4. Queue outbound sends. Apply per-instance, per-tenant, and per-contact rate limits before enqueueing.
5. Assign every outbound request a stable idempotency key based on tenant, instance, recipient, template or body hash, and campaign or workflow ID.
6. Treat webhooks as at-least-once delivery. Verify signature when available, dedupe by provider message ID, and make handlers idempotent.
7. Persist delivery, read, inbound, disconnect, reconnect, and pairing events as append-only state transitions.
8. Redact message bodies in logs unless a support or audit policy explicitly requires short-lived encrypted retention.
9. Surface recoverable admin states: QR expired, disconnected, webhook failing, send queued, send failed, rate limited, and consent missing.

## Current API Boundary

- Target Evolution API v2+ and use the instance's documented base URL plus the `apikey` header.
- Common v2 routes include `POST /instance/create` and `POST /message/sendText/{instanceName}`; verify the exact route in the deployed instance's OpenAPI/docs before coding because route shapes can differ between v1 and v2.
- Starting with Evolution API v2.4.0, self-hosted instances require activation/licensing before business endpoints serve traffic. Add license status/activation to deployment readiness checks and surface `503` activation failures distinctly from WhatsApp failures.

## Consent and Compliance

- Require explicit opt-in before sending non-transactional messages.
- Store consent source, timestamp, contact identity, tenant, scope, and revocation timestamp.
- Stop queued campaign or automation messages immediately when consent is revoked.
- Keep templates, campaign labels, and operator identity attached to sends for audit.

## Minimal Data Model

- `whatsapp_instances`: tenant ID, owner ID, instance name, status, QR state, webhook status, last heartbeat, disconnect reason.
- `whatsapp_contacts`: tenant ID, normalized number, profile name, consent state, consent scope, last inbound time.
- `message_events`: tenant ID, instance ID, provider message ID, idempotency key, direction, status, retry count, error class, timestamps.
- `message_threads`: tenant ID, contact ID, assignment state, last message time, unread count.

## Verification

- Test QR pairing, reconnect, disconnect, outbound queueing, duplicate outbound retry, inbound webhook dedupe, revoked consent, and rate-limit behavior.
- Confirm API keys and message bodies are absent from client bundles and normal logs.
- Replay the same webhook payload twice and verify only one business effect occurs.

## Official References

- https://docs.evolutionfoundation.com.br/en/evolution-api/create-instance
- https://docs.evolutionfoundation.com.br/evolution-api/send-text-message
- https://github.com/evolution-foundation/evolution-api/releases

## Related Skills

- `skill-saas-admin-dashboard`
- `skill-unified-analytics`
- `skill-security-hooks`
