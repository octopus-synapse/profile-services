-- Abolish the "system themes" naming and consolidate on ResumeStyle as the
-- single source of truth for visual style across onboarding and resumes.
--
-- Two structural changes ship in one migration so a partial rollback doesn't
-- leave the codebase referencing a column that's gone:
--
-- 1. `OnboardingProgress.templateSelection` (Json `{templateId, colorScheme}`)
--    → `OnboardingProgress.resumeStyleId` (FK to `ResumeStyle`, SET NULL).
--    The legacy JSON's `templateId` is already a `ResumeStyle.id` (see
--    `restart-onboarding.use-case.ts` which seeded it from
--    `resume.styleId`), it was just named badly. Backfill copies it over
--    when the value validates as an existing style id.
-- 2. `Resume.template` (free string PROFESSIONAL/CREATIVE/...) is dropped.
--    It had no writers and no readers; the canonical visual style is
--    `Resume.styleId` (FK to `ResumeStyle`).

-- ─── OnboardingProgress: new FK column ──────────────────────────────────────
ALTER TABLE "OnboardingProgress"
  ADD COLUMN "resumeStyleId" TEXT;

-- Backfill from the legacy JSON. Only rows where:
--   - templateSelection->>'templateId' is a non-empty string
--   - that value exists in ResumeStyle.id
-- The narrow WHERE keeps malformed legacy data (numeric ids, slugs from old
-- versions, NULL drafts) from breaking the FK creation below.
UPDATE "OnboardingProgress" op
SET "resumeStyleId" = (op."templateSelection"->>'templateId')
WHERE op."templateSelection" IS NOT NULL
  AND op."templateSelection"->>'templateId' IS NOT NULL
  AND op."templateSelection"->>'templateId' <> ''
  AND EXISTS (
    SELECT 1 FROM "ResumeStyle" rs
    WHERE rs.id = op."templateSelection"->>'templateId'
  );

ALTER TABLE "OnboardingProgress"
  ADD CONSTRAINT "OnboardingProgress_resumeStyleId_fkey"
  FOREIGN KEY ("resumeStyleId") REFERENCES "ResumeStyle"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "OnboardingProgress_resumeStyleId_idx"
  ON "OnboardingProgress"("resumeStyleId");

ALTER TABLE "OnboardingProgress"
  DROP COLUMN "templateSelection";

-- ─── Resume: drop the legacy free-string template column ────────────────────
ALTER TABLE "Resume"
  DROP COLUMN IF EXISTS "template";
