-- CreateTable
CREATE TABLE "resume_views_daily" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitorCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resume_views_daily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resume_views_daily_userId_day_idx" ON "resume_views_daily"("userId", "day");

-- CreateIndex
CREATE INDEX "resume_views_daily_day_idx" ON "resume_views_daily"("day");

-- CreateIndex
CREATE UNIQUE INDEX "resume_views_daily_resumeId_day_key" ON "resume_views_daily"("resumeId", "day");
