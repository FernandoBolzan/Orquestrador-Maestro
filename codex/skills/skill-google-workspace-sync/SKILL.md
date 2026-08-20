---
name: skill-google-workspace-sync
description: Use for Google Workspace integrations with OAuth, Calendar, Meet, FreeBusy, Drive, Sheets, webhooks, least-privilege scopes, encrypted refresh tokens, idempotent writes, reconciliation jobs, consent revocation, validation, and sync audit trails.
category: integrations
risk: high
source: google-workspace-api-patterns
last_verified: 2026-08-06
---

# Google Workspace Sync

Use this skill when a product connects Google accounts, syncs calendars or files, creates events, generates Meet links, calculates availability, or reconciles Workspace data.

## Core Workflow

1. Confirm the exact product surface and minimum scopes: Calendar, Events, FreeBusy, Meet, Drive, Sheets, or a combination.
2. Use server-side OAuth with `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and encrypted refresh tokens.
3. Request only the scopes needed for the current workflow. Store granted scopes and block features that require scopes the user did not grant.
4. Before each API call, use one token function that refreshes expired access tokens, persists token state, and handles revocation.
5. Normalize external resources with provider account ID, local owner, external ID, calendar or file ID, `etag`, `updated_at`, timezone, and sync status.
6. Use idempotency for writes. For Meet links, send a stable `requestId` and store the returned conference data.
7. Treat webhooks as hints, not complete truth. Run reconciliation jobs to catch missed notifications, remote deletes, conflicts, and token failures.
8. Queue bulk sync and retryable writes. Keep user-facing requests short and return job status for long operations.
9. Validate dates, timezones, attendees, file permissions, sheet ranges, and ownership before writing remote or local state.
10. Keep audit events for connect, scope change, create, update, delete, sync conflict, token refresh failure, and disconnect.

## API Maintenance Boundary

- Treat Calendar, Drive, Sheets, and Meet as separate APIs with separate enablement and scope review; do not grant a broad Workspace scope because one feature needs only one resource.
- Use the official Google client libraries or REST discovery documents and pin dependency versions through the host project's normal lockfile process.
- Re-check OAuth consent, verification, incremental authorization, push notification channels, and resource-specific quotas when adding a new Workspace surface.

## Guardrails

- Never expose client secrets, refresh tokens, access tokens, webhook secrets, or raw OAuth callbacks to the frontend.
- Never use broad scopes when a narrow scope is sufficient.
- Stop sync jobs when consent is revoked, OAuth tokens are invalid, or the provider account is disconnected.
- Use `etag` or equivalent concurrency checks before overwriting remote changes.
- Redact event descriptions, attendee notes, Drive content, and sheet cell values from normal logs.

## Minimal Data Model

```typescript
type WorkspaceResource = {
  id: string;
  userId: string;
  provider: "google";
  providerAccountId: string;
  resourceType: "calendar_event" | "drive_file" | "sheet_range";
  externalId: string;
  parentExternalId?: string;
  etag?: string;
  timezone?: string;
  syncStatus: "synced" | "pending" | "conflict" | "deleted" | "revoked";
  lastSyncedAt?: string;
};
```

## Verification

- Test OAuth callback, token refresh, missing scope, revoked consent, Calendar create/update/delete, Meet `requestId` dedupe, FreeBusy timezone handling, duplicate webhook, and reconciliation after missed webhook.
- Confirm no OAuth secret or token appears in browser bundles, logs, analytics, or error responses.

## Official References

- https://developers.google.com/workspace/guides/enable-apis
- https://developers.google.com/workspace/calendar/api/auth
- https://developers.google.com/workspace

## Related Skills

- `skill-unified-analytics`
- `skill-security-hooks`
