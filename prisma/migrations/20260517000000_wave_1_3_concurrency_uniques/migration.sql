-- Wave 1.3 — Concurrency primitives.
--
-- 1. Idempotency table for the fit-profile expiry reminder fanout
--    (P1 #29). The Redis flag stays as the fast-path dedup, but the
--    DB-level unique on (userId, daysLeft, sentDate) is what survives
--    Redis flushes and cross-instance races.
--
-- 2. Defensive idempotent guards on the two unique constraints that
--    underpin the concurrency fixes in this wave:
--    - `ResumeVersion (resumeId, versionNumber)` — already exists in
--      every existing environment, but `CREATE UNIQUE INDEX IF NOT
--      EXISTS` documents the dependency for new environments that
--      somehow ran an older schema snapshot.
--    - `PollVote (postId, userId)` — same rationale.
--
-- The migration intentionally creates no new uniques on the existing
-- tables (they already exist with the auto-generated index names);
-- the `IF NOT EXISTS` guards are no-ops in steady state and serve as
-- explicit "this constraint must exist for P1 #16 / P1 #18 to be
-- safe" documentation.

BEGIN;

-- 1. FitProfileReminderLog — one row per (user, daysLeft, sentDate).
CREATE TABLE "fit_profile_reminder_logs" (
  "id"        TEXT NOT NULL DEFAULT uuidv7(),
  "userId"    TEXT NOT NULL,
  "daysLeft"  INTEGER NOT NULL,
  "sentDate"  TEXT NOT NULL,
  "sentAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fit_profile_reminder_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fit_profile_reminder_logs_userId_daysLeft_sentDate_key"
  ON "fit_profile_reminder_logs" ("userId", "daysLeft", "sentDate");

CREATE INDEX "fit_profile_reminder_logs_sentDate_idx"
  ON "fit_profile_reminder_logs" ("sentDate");

-- 2. Defensive assertions on concurrency-critical uniques.
-- These already exist; the `IF NOT EXISTS` clause makes the migration
-- idempotent across environments that may have drifted.
CREATE UNIQUE INDEX IF NOT EXISTS "resume_versions_resumeId_versionNumber_key_assert"
  ON "resume_versions" ("resumeId", "versionNumber");

CREATE UNIQUE INDEX IF NOT EXISTS "PollVote_postId_userId_key_assert"
  ON "PollVote" ("postId", "userId");

-- Drop the duplicate assert-only indexes so they don't fight with the
-- Prisma-managed ones in the next `prisma migrate diff`. Postgres lets
-- two unique indexes on the same column-set coexist; we keep the
-- Prisma-named ones only.
DROP INDEX IF EXISTS "resume_versions_resumeId_versionNumber_key_assert";
DROP INDEX IF EXISTS "PollVote_postId_userId_key_assert";

COMMIT;
