-- CreateEnum
CREATE TYPE "BadgeKind" AS ENUM ('FIRST_BUILD', 'ATS_90_PLUS', 'MENTORED_10', 'INTERVIEWS_5', 'CONTRIBUTOR', 'EVENT_SPEAKER');

-- CreateEnum
CREATE TYPE "AnonymousCategory" AS ENUM ('SALARY', 'INTERVIEW', 'LAYOFF', 'TOXIC_CULTURE', 'HARASSMENT');

-- CreateEnum
CREATE TYPE "SuccessStoryStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "anonymousCategory" "AnonymousCategory",
ADD COLUMN     "isAnonymous" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "BadgeKind" NOT NULL,
    "context" JSONB,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuccessStory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "beforeText" TEXT NOT NULL,
    "afterText" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "timeframeDays" INTEGER,
    "status" "SuccessStoryStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "weight" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuccessStory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserBadge_userId_idx" ON "UserBadge"("userId");

-- CreateIndex
CREATE INDEX "UserBadge_kind_idx" ON "UserBadge"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_kind_key" ON "UserBadge"("userId", "kind");

-- CreateIndex
CREATE INDEX "SuccessStory_status_weight_publishedAt_idx" ON "SuccessStory"("status", "weight", "publishedAt");

-- CreateIndex
CREATE INDEX "SuccessStory_userId_idx" ON "SuccessStory"("userId");

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessStory" ADD CONSTRAINT "SuccessStory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
