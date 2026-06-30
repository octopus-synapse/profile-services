-- Freeze the Match Score at apply time. Nullable + additive: existing rows
-- keep NULL (no backfill); the job-match BC populates it async on
-- JobApplicationSubmittedEvent for applies made with a résumé + fit profile.
ALTER TABLE "JobApplication" ADD COLUMN "matchScoreSnapshot" INTEGER;
