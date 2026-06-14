-- workMode: filterable Presencial/Híbrido/Remoto signal on external
-- listings. JSearch only ships a binary "job_is_remote", so HYBRID is
-- inferred from title/description keywords — keep the stems below in
-- sync with src/bounded-contexts/jobs/domain/services/derive-work-mode.ts.
ALTER TABLE "ExternalJobListing" ADD COLUMN "workMode" "RemotePolicy" NOT NULL DEFAULT 'ONSITE';

-- Backfill existing rows (table is small: ~30 days × ~30 rows/day).
UPDATE "ExternalJobListing" SET "workMode" = 'REMOTE' WHERE "isRemote" = true;
-- ILIKE handles case; accented variants are enumerated explicitly so we
-- don't depend on the unaccent extension being installed.
UPDATE "ExternalJobListing" SET "workMode" = 'HYBRID'
WHERE "isRemote" = false
  AND (
    "title" ILIKE '%hybrid%' OR "title" ILIKE '%híbrid%' OR "title" ILIKE '%hibrid%'
    OR "description" ILIKE '%hybrid%' OR "description" ILIKE '%híbrid%' OR "description" ILIKE '%hibrid%'
  );

-- The remote filter now goes through workMode.
DROP INDEX "ExternalJobListing_isRemote_postedAt_idx";
CREATE INDEX "ExternalJobListing_workMode_postedAt_idx" ON "ExternalJobListing"("workMode", "postedAt");

-- SavedExternalJob: user-saved external listings. Listing rows are
-- swept after 30 days, so the display fields are snapshotted at save
-- time; no FK to ExternalJobListing on purpose. Cascades on user
-- erasure (LGPD, mirrors JobBookmark P0-#25).
CREATE TABLE "SavedExternalJob" (
    "id" TEXT NOT NULL DEFAULT uuidv7(),
    "userId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "isRemote" BOOLEAN NOT NULL,
    "workMode" "RemotePolicy" NOT NULL,
    "employmentType" "JobType",
    "applyUrl" TEXT NOT NULL,
    "publisher" TEXT,
    "description" TEXT,
    "postedAt" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedExternalJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SavedExternalJob_userId_externalId_key" ON "SavedExternalJob"("userId", "externalId");
CREATE INDEX "SavedExternalJob_userId_createdAt_idx" ON "SavedExternalJob"("userId", "createdAt");

ALTER TABLE "SavedExternalJob" ADD CONSTRAINT "SavedExternalJob_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
