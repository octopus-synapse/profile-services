ALTER TABLE "patch_go_billing" ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'go';

CREATE TABLE "patch_free_translation_usage" (
  "userId" TEXT NOT NULL,
  "monthStart" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "patch_free_translation_usage_pkey" PRIMARY KEY ("userId", "monthStart")
);
ALTER TABLE "patch_free_translation_usage" ADD CONSTRAINT "patch_free_translation_usage_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "patch_ai_usage" (
  "id" TEXT NOT NULL DEFAULT uuidv7(),
  "userId" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "plan" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "inputTokens" INTEGER NOT NULL,
  "outputTokens" INTEGER NOT NULL,
  "costUsdMicros" BIGINT,
  "costBrlMicros" BIGINT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "patch_ai_usage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "patch_ai_usage_userId_createdAt_idx" ON "patch_ai_usage"("userId", "createdAt");
ALTER TABLE "patch_ai_usage" ADD CONSTRAINT "patch_ai_usage_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
