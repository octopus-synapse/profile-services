-- Self-reported application state for external (off-app) listings.
--
-- Applying to an external job opens the publisher's site, so the outcome can't
-- be observed. The client prompts "você se candidatou?" on return and records
-- the answer here so the Candidaturas view can show self-reported external
-- applications alongside internal ones.
--   hasApplied: null = never asked / dismissed, true/false = the recorded answer
--   appliedAt:  set when the user confirms a "true" answer, null otherwise

ALTER TABLE "SavedExternalJob" ADD COLUMN "hasApplied" BOOLEAN;
ALTER TABLE "SavedExternalJob" ADD COLUMN "appliedAt" TIMESTAMP(3);

-- Serves the "my self-reported external applications" feed.
CREATE INDEX "SavedExternalJob_userId_hasApplied_appliedAt_idx"
  ON "SavedExternalJob" ("userId", "hasApplied", "appliedAt");
