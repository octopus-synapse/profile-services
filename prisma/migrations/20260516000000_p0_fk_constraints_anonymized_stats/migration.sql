-- P0 FK + anonymised stats sweep.
--
-- 1. Add real FK constraints on JobApplication.userId, JobBookmark.userId,
--    PollVote.userId so a user erasure cascades correctly (LGPD).
-- 2. Change Job.author FK to ON DELETE SET NULL so jobs survive author
--    erasure (analytics + outside-candidate visibility).
-- 3. Clean up any pre-existing orphan rows BEFORE the constraints are added
--    or Postgres will refuse with FK violation.
-- 4. Create AnonymizedApplicationStat as a User-independent snapshot table.

BEGIN;

-- 3a. Orphan cleanup (rows whose userId no longer references a real User).
DELETE FROM "JobApplication" WHERE "userId" NOT IN (SELECT "id" FROM "User");
DELETE FROM "JobBookmark"    WHERE "userId" NOT IN (SELECT "id" FROM "User");
DELETE FROM "PollVote"       WHERE "userId" NOT IN (SELECT "id" FROM "User");
-- Orphan jobs: if author was deleted before this migration, null out the FK.
UPDATE "Job" SET "authorId" = NULL WHERE "authorId" NOT IN (SELECT "id" FROM "User");

-- 2. Job.authorId nullable + SET NULL on delete.
ALTER TABLE "Job" ALTER COLUMN "authorId" DROP NOT NULL;
ALTER TABLE "Job" DROP CONSTRAINT IF EXISTS "Job_authorId_fkey";
ALTER TABLE "Job"
  ADD CONSTRAINT "Job_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 1. JobApplication.userId — Cascade on user delete.
ALTER TABLE "JobApplication" DROP CONSTRAINT IF EXISTS "JobApplication_userId_fkey";
ALTER TABLE "JobApplication"
  ADD CONSTRAINT "JobApplication_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 1. JobBookmark.userId — Cascade on user delete.
ALTER TABLE "JobBookmark" DROP CONSTRAINT IF EXISTS "JobBookmark_userId_fkey";
ALTER TABLE "JobBookmark"
  ADD CONSTRAINT "JobBookmark_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 1. PollVote.userId — Cascade on user delete.
ALTER TABLE "PollVote" DROP CONSTRAINT IF EXISTS "PollVote_userId_fkey";
ALTER TABLE "PollVote"
  ADD CONSTRAINT "PollVote_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. AnonymizedApplicationStat — independent snapshot, no FK to User/Job.
CREATE TABLE "AnonymizedApplicationStat" (
  "id"         TEXT NOT NULL DEFAULT uuidv7(),
  "jobId"      TEXT NOT NULL,
  "company"    TEXT NOT NULL,
  "status"     TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AnonymizedApplicationStat_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AnonymizedApplicationStat_jobId_status_occurredAt_idx"
  ON "AnonymizedApplicationStat" ("jobId", "status", "occurredAt");
CREATE INDEX "AnonymizedApplicationStat_company_occurredAt_idx"
  ON "AnonymizedApplicationStat" ("company", "occurredAt");

COMMIT;
