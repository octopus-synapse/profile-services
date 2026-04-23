-- scoring_refactor: rename ResumeTheme → ResumeStyle, drop ResumeTemplate,
-- add scoring subsystem tables (ResumeQualityScoreHistory, UserFitProfile,
-- JobFitProfile, FitQuestion/Answer/Set/RemapHistory), add Job requirements
-- columns + embeddingVector, install monotonic styleScore trigger.
--
-- This migration preserves data by copying ResumeTheme rows into ResumeStyle
-- with the same primary keys so existing Resume.activeThemeId values become
-- valid Resume.styleId values without remapping.

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. New enums
CREATE TYPE "LayoutKind" AS ENUM ('SINGLE_COLUMN', 'DOUBLE_COLUMN');

CREATE TYPE "FitDimension" AS ENUM (
  'BIG_FIVE_OPENNESS', 'BIG_FIVE_CONSCIENTIOUSNESS', 'BIG_FIVE_EXTRAVERSION',
  'BIG_FIVE_AGREEABLENESS', 'BIG_FIVE_NEUROTICISM',
  'SCHWARTZ_SELF_DIRECTION', 'SCHWARTZ_STIMULATION', 'SCHWARTZ_HEDONISM',
  'SCHWARTZ_ACHIEVEMENT', 'SCHWARTZ_POWER', 'SCHWARTZ_SECURITY',
  'SCHWARTZ_CONFORMITY', 'SCHWARTZ_TRADITION', 'SCHWARTZ_BENEVOLENCE',
  'SCHWARTZ_UNIVERSALISM',
  'SDT_AUTONOMY', 'SDT_COMPETENCE', 'SDT_RELATEDNESS'
);

-- 2. Create ResumeStyle table (data target for ResumeTheme copy)
CREATE TABLE "ResumeStyle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "authorId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "historyJson" JSONB NOT NULL DEFAULT '[]',
    "styleScore" INTEGER NOT NULL DEFAULT 0,
    "atsSafetyBreakdown" JSONB NOT NULL DEFAULT '{}',
    "layoutKind" "LayoutKind" NOT NULL DEFAULT 'SINGLE_COLUMN',
    "typstTemplate" TEXT NOT NULL,
    "styleConfig" JSONB NOT NULL,
    "sectionStyles" JSONB NOT NULL DEFAULT '{}',
    "thumbnailUrl" TEXT,
    "previewImages" TEXT[],
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "parentStyleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeStyle_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ResumeStyle_authorId_idx" ON "ResumeStyle"("authorId");
CREATE INDEX "ResumeStyle_isSystem_idx" ON "ResumeStyle"("isSystem");
CREATE INDEX "ResumeStyle_createdAt_idx" ON "ResumeStyle"("createdAt");

-- 3. Copy data from ResumeTheme → ResumeStyle (preserving ids so Resume FK
-- values remain valid after rename). `styleScore` is seeded from the old
-- `atsScore` column (null → 0). New required columns get defaults: every
-- migrated style is marked single-column + 'default' template and will be
-- re-scored by the Style Score calculator on first application boot.
INSERT INTO "ResumeStyle" (
    "id", "name", "description", "authorId",
    "version", "historyJson",
    "styleScore", "atsSafetyBreakdown",
    "layoutKind", "typstTemplate",
    "styleConfig", "sectionStyles",
    "thumbnailUrl", "previewImages",
    "isSystem", "parentStyleId",
    "createdAt", "updatedAt"
)
SELECT
    "id", "name", "description", "authorId",
    1 AS "version",
    '[]'::jsonb AS "historyJson",
    COALESCE("atsScore", 0) AS "styleScore",
    '{}'::jsonb AS "atsSafetyBreakdown",
    'SINGLE_COLUMN'::"LayoutKind" AS "layoutKind",
    'default' AS "typstTemplate",
    "styleConfig", "sectionStyles",
    "thumbnailUrl", "previewImages",
    "isSystemTheme" AS "isSystem",
    "parentThemeId" AS "parentStyleId",
    "createdAt", "updatedAt"
FROM "ResumeTheme";

-- 4. Rename Resume.activeThemeId → Resume.styleId (preserves data without
-- needing a separate UPDATE: the column is renamed, values stay intact)
ALTER TABLE "Resume" DROP CONSTRAINT IF EXISTS "Resume_activeThemeId_fkey";
DROP INDEX IF EXISTS "Resume_activeThemeId_idx";
ALTER TABLE "Resume" RENAME COLUMN "activeThemeId" TO "styleId";
CREATE INDEX "Resume_styleId_idx" ON "Resume"("styleId");

-- 5. Drop Resume.template column + enum
ALTER TABLE "Resume" DROP COLUMN "template";
DROP TYPE "ResumeTemplate";

-- 6. Drop ResumeTheme table + associated enums (data already copied above)
ALTER TABLE "ResumeTheme" DROP CONSTRAINT IF EXISTS "ResumeTheme_approvedById_fkey";
ALTER TABLE "ResumeTheme" DROP CONSTRAINT IF EXISTS "ResumeTheme_authorId_fkey";
ALTER TABLE "ResumeTheme" DROP CONSTRAINT IF EXISTS "ResumeTheme_parentThemeId_fkey";
DROP TABLE "ResumeTheme";
DROP TYPE "ThemeCategory";
DROP TYPE "ThemeStatus";

-- 7. Add ResumeStyle foreign keys (author + self-referential parent). The
-- parent FK is added AFTER the data copy so cycles within the hierarchy
-- don't break the insert ordering.
ALTER TABLE "ResumeStyle"
  ADD CONSTRAINT "ResumeStyle_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResumeStyle"
  ADD CONSTRAINT "ResumeStyle_parentStyleId_fkey"
  FOREIGN KEY ("parentStyleId") REFERENCES "ResumeStyle"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Resume"
  ADD CONSTRAINT "Resume_styleId_fkey"
  FOREIGN KEY ("styleId") REFERENCES "ResumeStyle"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 8. Monotonic Style Score invariant: an update may never lower styleScore.
-- Enforced at the DB level via a BEFORE UPDATE trigger so any code path
-- (ORM, raw SQL, manual patch) is constrained.
CREATE OR REPLACE FUNCTION "enforce_resume_style_monotonic_style_score"()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."styleScore" < OLD."styleScore" THEN
    RAISE EXCEPTION
      'ResumeStyle.styleScore is monotonic: attempted % → % for id %',
      OLD."styleScore", NEW."styleScore", OLD."id"
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "resume_style_monotonic_style_score"
BEFORE UPDATE ON "ResumeStyle"
FOR EACH ROW
EXECUTE FUNCTION "enforce_resume_style_monotonic_style_score"();

-- 9. Job: scoring-subsystem columns (structured requirements + AI enrichment
-- metadata + pgvector embedding for the Semantic Matcher)
ALTER TABLE "Job"
  ADD COLUMN "culturalProfileCaptured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "embeddingVector"          vector(1536),
  ADD COLUMN "enrichedAt"                TIMESTAMP(3),
  ADD COLUMN "enrichedBy"                TEXT,
  ADD COLUMN "requirementsEnrichedByAi"  JSONB,
  ADD COLUMN "requirementsStructured"    JSONB;

-- 10. resume_analytics: drop scoring columns (moved to ResumeQualityScoreHistory);
-- view-tracking columns remain on ResumeViewEvent (different table, untouched)
ALTER TABLE "resume_analytics"
  DROP COLUMN "atsScore",
  DROP COLUMN "completenessScore",
  DROP COLUMN "improvementSuggestions",
  DROP COLUMN "industryRank",
  DROP COLUMN "keywordScore",
  DROP COLUMN "missingKeywords",
  DROP COLUMN "topKeywords",
  DROP COLUMN "totalInIndustry";

-- 11. Scoring subsystem tables
CREATE TABLE "ResumeQualityScoreHistory" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "completenessScore" INTEGER NOT NULL,
    "contentQualityScore" INTEGER,
    "issuesJson" JSONB NOT NULL,
    "scoringRulesVersion" TEXT NOT NULL,
    "aiPromptVersion" TEXT,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aiCallsCount" INTEGER NOT NULL DEFAULT 0,
    "costUsdMicros" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "ResumeQualityScoreHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ResumeQualityScoreHistory_resumeId_computedAt_idx"
  ON "ResumeQualityScoreHistory"("resumeId", "computedAt");

ALTER TABLE "ResumeQualityScoreHistory"
  ADD CONSTRAINT "ResumeQualityScoreHistory_resumeId_fkey"
  FOREIGN KEY ("resumeId") REFERENCES "Resume"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserFitProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vectorJson" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserFitProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserFitProfile_userId_key" ON "UserFitProfile"("userId");
CREATE INDEX "UserFitProfile_expiresAt_idx" ON "UserFitProfile"("expiresAt");

ALTER TABLE "UserFitProfile"
  ADD CONSTRAINT "UserFitProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "JobFitProfile" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "vectorJson" JSONB NOT NULL,
    "editedByUserId" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobFitProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JobFitProfile_jobId_key" ON "JobFitProfile"("jobId");

ALTER TABLE "JobFitProfile"
  ADD CONSTRAINT "JobFitProfile_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "Job"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "FitQuestion" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "dimension" "FitDimension" NOT NULL,
    "textEn" TEXT NOT NULL,
    "textPtBr" TEXT NOT NULL,
    "scaleType" TEXT NOT NULL,
    "weight" DECIMAL(65,30) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FitQuestion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FitQuestion_key_key" ON "FitQuestion"("key");

CREATE TABLE "FitQuestionSet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "FitQuestionSet_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FitQuestionSet_userId_createdAt_idx"
  ON "FitQuestionSet"("userId", "createdAt");

ALTER TABLE "FitQuestionSet"
  ADD CONSTRAINT "FitQuestionSet_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "FitAnswer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "rawValue" INTEGER NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "questionSetId" TEXT NOT NULL,

    CONSTRAINT "FitAnswer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FitAnswer_userId_answeredAt_idx" ON "FitAnswer"("userId", "answeredAt");
CREATE INDEX "FitAnswer_questionSetId_idx" ON "FitAnswer"("questionSetId");

ALTER TABLE "FitAnswer"
  ADD CONSTRAINT "FitAnswer_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FitAnswer"
  ADD CONSTRAINT "FitAnswer_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "FitQuestion"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FitAnswer"
  ADD CONSTRAINT "FitAnswer_questionSetId_fkey"
  FOREIGN KEY ("questionSetId") REFERENCES "FitQuestionSet"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "FitRemapHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vectorJson" JSONB NOT NULL,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FitRemapHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FitRemapHistory_userId_snapshotAt_idx"
  ON "FitRemapHistory"("userId", "snapshotAt");

ALTER TABLE "FitRemapHistory"
  ADD CONSTRAINT "FitRemapHistory_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
