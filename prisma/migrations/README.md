# Prisma migrations — operational notes

Most migrations are routine and need nothing beyond `prisma migrate
deploy`. This file documents the few that need extra care.

## UUID v7 rollout (Q11 + Q74)

The project standardised on UUID v7 for every primary key (Q11). The
rollout happens in two phases so the schema swap is reversible:

### Phase 1 — install the extension

Migration: `20260503120000_install_pg_uuidv7`

Adds the `pg_uuidv7` Postgres extension. Required for
`@default(dbgenerated("uuidv7()"))` on Prisma model fields.

**Operational requirement:** the extension must be on the managed-Postgres
allowlist. On RDS, set `shared_preload_libraries` to include
`pg_uuidv7` and run `CREATE EXTENSION pg_uuidv7;` from a super-user.

### Phase 2 — swap defaults + backfill (TODO, separate PR)

A follow-up migration will:

1. For each table with a string PK currently defaulting to `cuid()` /
   `uuid()` v4, change the column default to
   `uuidv7()`.
2. Backfill historical rows: optional. New IDs use v7; legacy v4 IDs
   stay valid because v4/v7 share the same UUID textual form.
3. Update Prisma schema to drop `@default(cuid())` /
   `@default(uuid())` in favour of `@default(dbgenerated("uuidv7()"))`.
4. Tighten Zod validation to `z.string().uuid()` everywhere
   (currently `z.string().min(1)` for params per the plan in
   `docs/audits/duplication-audit-2026-05-03.md`).

Phase 2 is split out because it touches every model in the schema and
needs a coordinated app deploy + DB migration window. The lint rule
that enforces `z.string().uuid()` lands with the same PR.

## 'es' locale removal

Migration `20260508000000_strip_es_locale_from_translations` strips the
`es` key from `SectionType.translations` and `OnboardingStep.translations`
JSONB columns. Idempotent — only updates rows that contain the `es` key.
The `Locale` type was already a pure TS union; this migration cleans up
data that was written before the type was tightened.
