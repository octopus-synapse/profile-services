-- Migration: Migrate OnboardingProgress to Generic Sections
-- Converts legacy columns (experiences, education, skills, languages) to generic sections JSON
-- Then drops the legacy columns. No backwards compatibility.

-- ============================================================================
-- STEP 1: Add sections column
-- ============================================================================

ALTER TABLE "OnboardingProgress" ADD COLUMN "sections" JSONB;

-- ============================================================================
-- STEP 2: Migrate existing data to sections array
-- ============================================================================

UPDATE "OnboardingProgress"
SET "sections" = (
  SELECT jsonb_agg(section)
  FROM (
    SELECT jsonb_build_object(
      'sectionTypeKey', 'work_experience_v1',
      'items', COALESCE("experiences", '[]'::jsonb),
      'noData', "noExperience"
    ) AS section
    WHERE "experiences" IS NOT NULL OR "noExperience" = true
    UNION ALL
    SELECT jsonb_build_object(
      'sectionTypeKey', 'education_v1',
      'items', COALESCE("education", '[]'::jsonb),
      'noData', "noEducation"
    )
    WHERE "education" IS NOT NULL OR "noEducation" = true
    UNION ALL
    SELECT jsonb_build_object(
      'sectionTypeKey', 'skill_set_v1',
      'items', COALESCE("skills", '[]'::jsonb),
      'noData', "noSkills"
    )
    WHERE "skills" IS NOT NULL OR "noSkills" = true
    UNION ALL
    SELECT jsonb_build_object(
      'sectionTypeKey', 'language_v1',
      'items', COALESCE("languages", '[]'::jsonb),
      'noData', false
    )
    WHERE "languages" IS NOT NULL
  ) AS sections_data
)
WHERE "experiences" IS NOT NULL 
   OR "education" IS NOT NULL 
   OR "skills" IS NOT NULL 
   OR "languages" IS NOT NULL
   OR "noExperience" = true
   OR "noEducation" = true
   OR "noSkills" = true;

-- ============================================================================
-- STEP 3: Drop legacy columns
-- ============================================================================

ALTER TABLE "OnboardingProgress" DROP COLUMN "experiences";
ALTER TABLE "OnboardingProgress" DROP COLUMN "noExperience";
ALTER TABLE "OnboardingProgress" DROP COLUMN "education";
ALTER TABLE "OnboardingProgress" DROP COLUMN "noEducation";
ALTER TABLE "OnboardingProgress" DROP COLUMN "skills";
ALTER TABLE "OnboardingProgress" DROP COLUMN "noSkills";
ALTER TABLE "OnboardingProgress" DROP COLUMN "languages";
