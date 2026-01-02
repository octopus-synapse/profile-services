/*
  Warnings:

  - The `template` column on the `Resume` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `bannerColor` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `palette` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('USERNAME_CHANGED', 'PROFILE_UPDATED', 'RESUME_CREATED', 'RESUME_UPDATED', 'RESUME_DELETED', 'RESUME_VISIBILITY_CHANGED', 'PREFERENCES_UPDATED', 'ONBOARDING_COMPLETED', 'ACCOUNT_DELETED', 'PASSWORD_CHANGED', 'EMAIL_CHANGED', 'UNAUTHORIZED_ACCESS_ATTEMPT');

-- CreateEnum
CREATE TYPE "ResumeTemplate" AS ENUM ('PROFESSIONAL', 'CREATIVE', 'TECHNICAL', 'MINIMAL', 'MODERN', 'EXECUTIVE', 'ACADEMIC');

-- Step 1: Create AuditLog table first
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changesBefore" JSONB,
    "changesAfter" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- Step 2: Add expiresAt to OnboardingProgress
ALTER TABLE "OnboardingProgress" ADD COLUMN "expiresAt" TIMESTAMP(3);

-- Step 3: Add primaryResumeId to User
ALTER TABLE "User" ADD COLUMN "primaryResumeId" TEXT;

-- Step 4: Migrate User.palette and User.bannerColor to UserPreferences
-- Create UserPreferences for users who don't have one but have legacy fields
INSERT INTO "UserPreferences" ("id", "userId", "palette", "bannerColor", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid()::text,
  u.id,
  COALESCE(u.palette, 'ocean'),
  u."bannerColor",
  NOW(),
  NOW()
FROM "User" u
WHERE u.id NOT IN (SELECT "userId" FROM "UserPreferences")
  AND (u.palette IS NOT NULL OR u."bannerColor" IS NOT NULL);

-- Update existing UserPreferences with legacy data if not already set
UPDATE "UserPreferences" up
SET 
  palette = COALESCE(up.palette, u.palette, 'ocean'),
  "bannerColor" = COALESCE(up."bannerColor", u."bannerColor")
FROM "User" u
WHERE up."userId" = u.id
  AND (u.palette IS NOT NULL OR u."bannerColor" IS NOT NULL);

-- Step 5: Set primaryResumeId to first resume for each user
UPDATE "User" u
SET "primaryResumeId" = (
  SELECT r.id 
  FROM "Resume" r 
  WHERE r."userId" = u.id 
  ORDER BY r."createdAt" ASC 
  LIMIT 1
)
WHERE u."hasCompletedOnboarding" = true;

-- Step 6: Migrate template strings to enum
-- Map legacy string values to enum values (case insensitive)
UPDATE "Resume" SET template = 'PROFESSIONAL' WHERE LOWER(template) IN ('professional', 'prof');
UPDATE "Resume" SET template = 'CREATIVE' WHERE LOWER(template) = 'creative';
UPDATE "Resume" SET template = 'TECHNICAL' WHERE LOWER(template) IN ('technical', 'tech');
UPDATE "Resume" SET template = 'MINIMAL' WHERE LOWER(template) IN ('minimal', 'min');
UPDATE "Resume" SET template = 'MODERN' WHERE LOWER(template) = 'modern';
UPDATE "Resume" SET template = 'EXECUTIVE' WHERE LOWER(template) IN ('executive', 'exec');
UPDATE "Resume" SET template = 'ACADEMIC' WHERE LOWER(template) IN ('academic', 'acad');

-- Step 7: Now safe to alter Resume.template column
-- First drop the default, then change type, then set new default
ALTER TABLE "Resume" ALTER COLUMN "template" DROP DEFAULT;
ALTER TABLE "Resume" ALTER COLUMN "template" TYPE "ResumeTemplate" USING "template"::"ResumeTemplate";
ALTER TABLE "Resume" ALTER COLUMN "template" SET DEFAULT 'PROFESSIONAL';

-- Step 8: Drop legacy columns from User (data already migrated)
ALTER TABLE "User" DROP COLUMN "bannerColor";
ALTER TABLE "User" DROP COLUMN "palette";

-- Step 9: Create indexes
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "OnboardingProgress_expiresAt_idx" ON "OnboardingProgress"("expiresAt");
CREATE INDEX "User_primaryResumeId_idx" ON "User"("primaryResumeId");

-- Step 10: Add foreign keys
ALTER TABLE "User" ADD CONSTRAINT "User_primaryResumeId_fkey" FOREIGN KEY ("primaryResumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
