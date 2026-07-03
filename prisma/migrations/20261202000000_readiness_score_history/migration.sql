-- Readiness Score history — append-only snapshots of the per-master-resume
-- Readiness Score (job-independent "how ready is this resume to compete").
-- Owned by the job-match BC; mirrors ResumeQualityScoreHistory.

CREATE TABLE "ReadinessScoreHistory" (
    "id" TEXT NOT NULL DEFAULT uuidv7(),
    "resumeId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "qualityScore" INTEGER,
    "coverageScore" INTEGER,
    "fitScore" INTEGER,
    "rulesVersion" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadinessScoreHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReadinessScoreHistory_resumeId_computedAt_idx"
  ON "ReadinessScoreHistory"("resumeId", "computedAt");

ALTER TABLE "ReadinessScoreHistory"
  ADD CONSTRAINT "ReadinessScoreHistory_resumeId_fkey"
  FOREIGN KEY ("resumeId") REFERENCES "Resume"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
