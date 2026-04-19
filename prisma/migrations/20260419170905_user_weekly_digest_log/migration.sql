-- CreateTable
CREATE TABLE "user_weekly_digest_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_weekly_digest_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_weekly_digest_logs_weekKey_idx" ON "user_weekly_digest_logs"("weekKey");

-- CreateIndex
CREATE INDEX "user_weekly_digest_logs_userId_idx" ON "user_weekly_digest_logs"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_weekly_digest_logs_userId_weekKey_key" ON "user_weekly_digest_logs"("userId", "weekKey");
