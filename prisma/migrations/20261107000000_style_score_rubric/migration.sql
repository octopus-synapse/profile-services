-- Style Score rubric refactor:
--   1. Rename ResumeStyle.atsSafetyBreakdown -> styleScoreBreakdown (new shape:
--      { buckets: { ...bucket: points }, issues: StyleIssue[] }).
--   2. Drop the monotonic styleScore trigger/function — the score is now
--      recomputed from styleConfig and may move in either direction.
--   3. Add the data-driven StyleScoringCriterion catalog table.

-- 1. Rename the breakdown column.
ALTER TABLE "ResumeStyle" RENAME COLUMN "atsSafetyBreakdown" TO "styleScoreBreakdown";

-- 2. Drop the monotonic guard installed by 20260423221242_scoring_refactor.
DROP TRIGGER IF EXISTS "resume_style_monotonic_style_score" ON "ResumeStyle";
DROP FUNCTION IF EXISTS "enforce_resume_style_monotonic_style_score"();

-- 3. Data-driven Style Score rubric catalog.
CREATE TABLE "StyleScoringCriterion" (
    "id" TEXT NOT NULL DEFAULT uuidv7(),
    "key" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "severity" TEXT NOT NULL,
    "params" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StyleScoringCriterion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StyleScoringCriterion_key_key" ON "StyleScoringCriterion"("key");
CREATE INDEX "StyleScoringCriterion_active_idx" ON "StyleScoringCriterion"("active");
