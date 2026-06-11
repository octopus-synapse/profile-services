-- ExternalJobListing: read-only mirror of third-party postings ingested
-- daily from the JSearch aggregator (RapidAPI). Decoupled from "Job"
-- (no FKs, no fit-score); 30-day retention enforced by the ingestion
-- worker, not the schema. "externalId" is JSearch's job_id; "dedupHash"
-- (normalized title|company) absorbs re-listings under other publishers.
CREATE TABLE "ExternalJobListing" (
    "id" TEXT NOT NULL DEFAULT uuidv7(),
    "externalId" TEXT NOT NULL,
    "dedupHash" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "isRemote" BOOLEAN NOT NULL DEFAULT false,
    "employmentType" "JobType",
    "applyUrl" TEXT NOT NULL,
    "publisher" TEXT,
    "description" TEXT,
    "postedAt" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "sourceQuery" TEXT NOT NULL,
    "raw" JSONB NOT NULL,

    CONSTRAINT "ExternalJobListing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExternalJobListing_externalId_key" ON "ExternalJobListing"("externalId");
CREATE INDEX "ExternalJobListing_dedupHash_idx" ON "ExternalJobListing"("dedupHash");
CREATE INDEX "ExternalJobListing_fetchedAt_idx" ON "ExternalJobListing"("fetchedAt");
CREATE INDEX "ExternalJobListing_postedAt_idx" ON "ExternalJobListing"("postedAt");
CREATE INDEX "ExternalJobListing_isRemote_postedAt_idx" ON "ExternalJobListing"("isRemote", "postedAt");
CREATE INDEX "ExternalJobListing_employmentType_postedAt_idx" ON "ExternalJobListing"("employmentType", "postedAt");
