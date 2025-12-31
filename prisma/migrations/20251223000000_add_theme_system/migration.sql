-- CreateEnum
CREATE TYPE "ThemeStatus" AS ENUM ('DRAFT', 'PRIVATE', 'PENDING_APPROVAL', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ThemeCategory" AS ENUM ('PROFESSIONAL', 'CREATIVE', 'TECHNICAL', 'ACADEMIC', 'MINIMAL', 'MODERN', 'CLASSIC', 'EXECUTIVE');

-- CreateEnum
CREATE TYPE "TechAreaType" AS ENUM ('DEVELOPMENT', 'DEVOPS', 'DATA', 'SECURITY', 'DESIGN', 'PRODUCT', 'QA', 'INFRASTRUCTURE', 'OTHER');

-- CreateEnum
CREATE TYPE "SkillType" AS ENUM ('LANGUAGE', 'FRAMEWORK', 'LIBRARY', 'DATABASE', 'TOOL', 'PLATFORM', 'METHODOLOGY', 'SOFT_SKILL', 'CERTIFICATION', 'OTHER');

-- CreateTable
CREATE TABLE "ResumeTheme" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "authorId" TEXT NOT NULL,
    "category" "ThemeCategory" NOT NULL DEFAULT 'MODERN',
    "tags" TEXT[],
    "styleConfig" JSONB NOT NULL,
    "thumbnailUrl" TEXT,
    "previewImages" TEXT[],
    "status" "ThemeStatus" NOT NULL DEFAULT 'PRIVATE',
    "isSystemTheme" BOOLEAN NOT NULL DEFAULT false,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "parentThemeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "ResumeTheme_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Resume" ADD COLUMN "activeThemeId" TEXT;

-- CreateIndex
CREATE INDEX "ResumeTheme_authorId_idx" ON "ResumeTheme"("authorId");

-- CreateIndex
CREATE INDEX "ResumeTheme_status_idx" ON "ResumeTheme"("status");

-- CreateIndex
CREATE INDEX "ResumeTheme_category_idx" ON "ResumeTheme"("category");

-- CreateIndex
CREATE INDEX "ResumeTheme_isSystemTheme_idx" ON "ResumeTheme"("isSystemTheme");

-- CreateIndex
CREATE INDEX "ResumeTheme_usageCount_idx" ON "ResumeTheme"("usageCount");

-- CreateIndex
CREATE INDEX "ResumeTheme_rating_idx" ON "ResumeTheme"("rating");

-- CreateIndex
CREATE INDEX "ResumeTheme_createdAt_idx" ON "ResumeTheme"("createdAt");

-- CreateIndex
CREATE INDEX "ResumeTheme_publishedAt_idx" ON "ResumeTheme"("publishedAt");

-- CreateIndex
CREATE INDEX "Resume_activeThemeId_idx" ON "Resume"("activeThemeId");

-- AddForeignKey
ALTER TABLE "Resume" ADD CONSTRAINT "Resume_activeThemeId_fkey" FOREIGN KEY ("activeThemeId") REFERENCES "ResumeTheme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeTheme" ADD CONSTRAINT "ResumeTheme_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeTheme" ADD CONSTRAINT "ResumeTheme_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeTheme" ADD CONSTRAINT "ResumeTheme_parentThemeId_fkey" FOREIGN KEY ("parentThemeId") REFERENCES "ResumeTheme"("id") ON DELETE SET NULL ON UPDATE CASCADE;
