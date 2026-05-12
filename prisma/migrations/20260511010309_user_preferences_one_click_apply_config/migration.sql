-- Add One-Click Apply config blob (F3-PD-009a).
-- Opaque JSON validated by Zod at the route layer. Holds:
--   { enabled, resumeId, coverLetterTemplate, tailoringMode, alsoAttach: { githubUrl, linkedinUrl } }
ALTER TABLE "UserPreferences"
  ADD COLUMN "oneClickApplyConfig" JSONB;
