---
name: skill-database-migrations
description: Planeja e verifica migrações de banco com compatibilidade, idempotência, RLS, seeds, índices, backfill e rollback seguro.
category: database
risk: high
source: orquestrador-native
---

# Database Migrations

Inspect schema, ORM conventions, deployment order, RLS, indexes, data volume, and rollback constraints. Prefer expand-migrate-contract: add compatible structures, deploy code, backfill in bounded batches, then contract later. Define locks, timeout, retry, idempotency, observability, and verification queries. Treat production data changes as high risk and require authorization before execution.
