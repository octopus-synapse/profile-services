-- ADR-003 §9: cost per user for the bilingual write-through. The monthly
-- cap reads the sum of `costUsdMicros` per user since the first of the month.
CREATE TABLE "translation_cost_entries" (
  "id" TEXT NOT NULL DEFAULT uuidv7(),
  "userId" TEXT NOT NULL,
  "resumeId" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "tokensUsed" INTEGER NOT NULL,
  "costUsdMicros" BIGINT NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "translation_cost_entries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "translation_cost_entries_userId_createdAt_idx" ON "translation_cost_entries"("userId", "createdAt");
CREATE INDEX "translation_cost_entries_resumeId_idx" ON "translation_cost_entries"("resumeId");
