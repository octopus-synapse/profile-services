-- Apply flow for external listings:
-- 1. Tailored resume versions can target an ExternalJobListing (bare id, no
--    FK — the mirror row is swept after 30 days) and snapshot the job's
--    title/company so the versions list stays labelled for both targets.
-- 2. SavedExternalJob records which CV backed a confirmed application
--    (resume / tailored version / compatibility score at apply time).

ALTER TABLE "resume_versions"
  ADD COLUMN "tailoredExternalJobId" TEXT,
  ADD COLUMN "tailoredJobTitleSnapshot" TEXT,
  ADD COLUMN "tailoredJobCompanySnapshot" TEXT;

ALTER TABLE "SavedExternalJob"
  ADD COLUMN "appliedResumeId" TEXT,
  ADD COLUMN "appliedTailoredVersionId" TEXT,
  ADD COLUMN "appliedMatchScore" INTEGER;
