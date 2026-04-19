-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'SKILL_DECAY';
ALTER TYPE "NotificationType" ADD VALUE 'APPLICATION_STALE';
ALTER TYPE "NotificationType" ADD VALUE 'CONNECTION_RECOMMENDATION';

-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN     "tailoredVersionId" TEXT;

-- CreateTable
CREATE TABLE "job_application_reminder_logs" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_application_reminder_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_time_capsule_logs" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "capsuleYear" INTEGER NOT NULL,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resume_time_capsule_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shadow_profiles" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalHandle" TEXT NOT NULL,
    "contactEmail" TEXT,
    "payload" JSONB NOT NULL,
    "claimedByUserId" TEXT,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shadow_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_decay_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillName" TEXT NOT NULL,
    "quarterKey" TEXT NOT NULL,
    "daysSinceTouched" INTEGER NOT NULL,
    "emittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_decay_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_application_reminder_logs_applicationId_idx" ON "job_application_reminder_logs"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "job_application_reminder_logs_applicationId_threshold_key" ON "job_application_reminder_logs"("applicationId", "threshold");

-- CreateIndex
CREATE INDEX "resume_time_capsule_logs_capsuleYear_idx" ON "resume_time_capsule_logs"("capsuleYear");

-- CreateIndex
CREATE UNIQUE INDEX "resume_time_capsule_logs_resumeId_capsuleYear_key" ON "resume_time_capsule_logs"("resumeId", "capsuleYear");

-- CreateIndex
CREATE INDEX "shadow_profiles_contactEmail_idx" ON "shadow_profiles"("contactEmail");

-- CreateIndex
CREATE INDEX "shadow_profiles_claimedByUserId_idx" ON "shadow_profiles"("claimedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "shadow_profiles_source_externalHandle_key" ON "shadow_profiles"("source", "externalHandle");

-- CreateIndex
CREATE INDEX "skill_decay_logs_userId_idx" ON "skill_decay_logs"("userId");

-- CreateIndex
CREATE INDEX "skill_decay_logs_quarterKey_idx" ON "skill_decay_logs"("quarterKey");

-- CreateIndex
CREATE UNIQUE INDEX "skill_decay_logs_userId_skillName_quarterKey_key" ON "skill_decay_logs"("userId", "skillName", "quarterKey");
