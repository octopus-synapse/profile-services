-- CreateEnum
CREATE TYPE "AnalyticsEvent" AS ENUM ('VIEW', 'DOWNLOAD');

-- AlterTable
ALTER TABLE "ResumeTheme" ADD COLUMN     "rejectionCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "resume_shares" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "password" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resume_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_versions" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resume_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_analytics" (
    "id" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "event" "AnalyticsEvent" NOT NULL,
    "ipHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "referer" TEXT,
    "country" TEXT,
    "city" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "resume_shares_slug_key" ON "resume_shares"("slug");

-- CreateIndex
CREATE INDEX "resume_shares_resumeId_idx" ON "resume_shares"("resumeId");

-- CreateIndex
CREATE INDEX "resume_shares_slug_idx" ON "resume_shares"("slug");

-- CreateIndex
CREATE INDEX "resume_versions_resumeId_idx" ON "resume_versions"("resumeId");

-- CreateIndex
CREATE INDEX "resume_versions_createdAt_idx" ON "resume_versions"("createdAt");

-- CreateIndex
CREATE INDEX "share_analytics_shareId_idx" ON "share_analytics"("shareId");

-- CreateIndex
CREATE INDEX "share_analytics_createdAt_idx" ON "share_analytics"("createdAt");

-- CreateIndex
CREATE INDEX "share_analytics_event_idx" ON "share_analytics"("event");

-- AddForeignKey
ALTER TABLE "resume_shares" ADD CONSTRAINT "resume_shares_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_versions" ADD CONSTRAINT "resume_versions_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_analytics" ADD CONSTRAINT "share_analytics_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "resume_shares"("id") ON DELETE CASCADE ON UPDATE CASCADE;
