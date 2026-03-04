-- Generic Section Counts Migration
-- Replaces individual section count columns with a single JSON column
-- This supports unlimited section types without schema changes

-- Step 1: Add the new generic JSON column
ALTER TABLE "analytics_resume_projection" ADD COLUMN "sectionCounts" JSONB NOT NULL DEFAULT '{}';

-- Step 2: Migrate existing data to the new JSON format
UPDATE "analytics_resume_projection"
SET "sectionCounts" = jsonb_build_object(
  'WORK_EXPERIENCE', "experiencesCount",
  'EDUCATION', "educationCount",
  'SKILL_SET', "skillsCount",
  'CERTIFICATION', "certificationsCount",
  'PROJECT', "projectsCount",
  'AWARD', "awardsCount",
  'LANGUAGE', "languagesCount",
  'INTEREST', "interestsCount",
  'RECOMMENDATION', "recommendationsCount",
  'ACHIEVEMENT', "achievementsCount",
  'PUBLICATION', "publicationsCount",
  'TALK', "talksCount",
  'HACKATHON', "hackathonsCount",
  'BUG_BOUNTY', "bugBountiesCount",
  'OPEN_SOURCE', "openSourceCount"
);

-- Step 3: Drop the legacy columns
ALTER TABLE "analytics_resume_projection" DROP COLUMN "experiencesCount";
ALTER TABLE "analytics_resume_projection" DROP COLUMN "educationCount";
ALTER TABLE "analytics_resume_projection" DROP COLUMN "skillsCount";
ALTER TABLE "analytics_resume_projection" DROP COLUMN "certificationsCount";
ALTER TABLE "analytics_resume_projection" DROP COLUMN "projectsCount";
ALTER TABLE "analytics_resume_projection" DROP COLUMN "awardsCount";
ALTER TABLE "analytics_resume_projection" DROP COLUMN "languagesCount";
ALTER TABLE "analytics_resume_projection" DROP COLUMN "interestsCount";
ALTER TABLE "analytics_resume_projection" DROP COLUMN "recommendationsCount";
ALTER TABLE "analytics_resume_projection" DROP COLUMN "achievementsCount";
ALTER TABLE "analytics_resume_projection" DROP COLUMN "publicationsCount";
ALTER TABLE "analytics_resume_projection" DROP COLUMN "talksCount";
ALTER TABLE "analytics_resume_projection" DROP COLUMN "hackathonsCount";
ALTER TABLE "analytics_resume_projection" DROP COLUMN "bugBountiesCount";
ALTER TABLE "analytics_resume_projection" DROP COLUMN "openSourceCount";

-- Step 4: Create GIN index for efficient JSON querying
CREATE INDEX "analytics_resume_projection_sectionCounts_idx" 
ON "analytics_resume_projection" USING GIN ("sectionCounts");
