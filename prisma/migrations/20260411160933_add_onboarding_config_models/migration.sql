/*
  Warnings:

  - You are about to drop the `AttestationWitnessRun` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Award` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Certification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Education` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Experience` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Interest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Language` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Project` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Recommendation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Skill` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Award" DROP CONSTRAINT "Award_resumeId_fkey";

-- DropForeignKey
ALTER TABLE "Certification" DROP CONSTRAINT "Certification_resumeId_fkey";

-- DropForeignKey
ALTER TABLE "Education" DROP CONSTRAINT "Education_resumeId_fkey";

-- DropForeignKey
ALTER TABLE "Experience" DROP CONSTRAINT "Experience_resumeId_fkey";

-- DropForeignKey
ALTER TABLE "Interest" DROP CONSTRAINT "Interest_resumeId_fkey";

-- DropForeignKey
ALTER TABLE "Language" DROP CONSTRAINT "Language_resumeId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_resumeId_fkey";

-- DropForeignKey
ALTER TABLE "Recommendation" DROP CONSTRAINT "Recommendation_resumeId_fkey";

-- DropForeignKey
ALTER TABLE "Skill" DROP CONSTRAINT "Skill_resumeId_fkey";

-- DropIndex
DROP INDEX "idx_user_roles";

-- DropIndex
DROP INDEX "analytics_resume_projection_sectionCounts_idx";

-- AlterTable
ALTER TABLE "ResumeTheme" ADD COLUMN     "atsScore" INTEGER;

-- AlterTable
ALTER TABLE "SectionType" ADD COLUMN     "examples" JSONB NOT NULL DEFAULT '{}';

-- DropTable
DROP TABLE "AttestationWitnessRun";

-- DropTable
DROP TABLE "Award";

-- DropTable
DROP TABLE "Certification";

-- DropTable
DROP TABLE "Education";

-- DropTable
DROP TABLE "Experience";

-- DropTable
DROP TABLE "Interest";

-- DropTable
DROP TABLE "Language";

-- DropTable
DROP TABLE "Project";

-- DropTable
DROP TABLE "Recommendation";

-- DropTable
DROP TABLE "Skill";

-- CreateTable
CREATE TABLE "OnboardingStep" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "component" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '📄',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "sectionTypeKey" TEXT,
    "fields" JSONB NOT NULL DEFAULT '[]',
    "translations" JSONB NOT NULL DEFAULT '{}',
    "validation" JSONB NOT NULL DEFAULT '{}',
    "strengthWeight" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'default',
    "strengthLevels" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingStep_key_key" ON "OnboardingStep"("key");

-- CreateIndex
CREATE INDEX "OnboardingStep_order_idx" ON "OnboardingStep"("order");

-- CreateIndex
CREATE INDEX "OnboardingStep_isActive_idx" ON "OnboardingStep"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingConfig_key_key" ON "OnboardingConfig"("key");

-- AddForeignKey
ALTER TABLE "OnboardingStep" ADD CONSTRAINT "OnboardingStep_sectionTypeKey_fkey" FOREIGN KEY ("sectionTypeKey") REFERENCES "SectionType"("key") ON DELETE SET NULL ON UPDATE CASCADE;
