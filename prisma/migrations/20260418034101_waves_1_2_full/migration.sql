-- CreateEnum
CREATE TYPE "WeeklyCuratedBatchStatus" AS ENUM ('PENDING', 'SENT', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "WeeklyCuratedItemStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentCurrency" AS ENUM ('BRL', 'USD', 'EUR', 'GBP');

-- CreateEnum
CREATE TYPE "RemotePolicy" AS ENUM ('REMOTE', 'HYBRID', 'ONSITE');

-- CreateEnum
CREATE TYPE "EnglishLevel" AS ENUM ('BASIC', 'INTERMEDIATE', 'ADVANCED', 'FLUENT');

-- CreateEnum
CREATE TYPE "ApplyMode" AS ENUM ('ONE_CLICK', 'WEEKLY_CURATED', 'AUTO_APPLY');

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "minEnglishLevel" "EnglishLevel",
ADD COLUMN     "paymentCurrency" "PaymentCurrency",
ADD COLUMN     "remotePolicy" "RemotePolicy";

-- AlterTable
ALTER TABLE "UserPreferences" ADD COLUMN     "applyMode" "ApplyMode" NOT NULL DEFAULT 'ONE_CLICK';

-- AlterTable
ALTER TABLE "resume_versions" ADD COLUMN     "isTailored" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tailoredJobId" TEXT;

-- CreateTable
CREATE TABLE "WeeklyCuratedBatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekOf" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" "WeeklyCuratedBatchStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyCuratedBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyCuratedItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "matchScore" INTEGER NOT NULL,
    "status" "WeeklyCuratedItemStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "decidedAt" TIMESTAMP(3),
    "applicationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyCuratedItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserApplyCriteria" (
    "id" TEXT NOT NULL,
    "preferencesId" TEXT NOT NULL,
    "minFit" INTEGER,
    "stacks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "seniorities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "remotePolicies" "RemotePolicy"[] DEFAULT ARRAY[]::"RemotePolicy"[],
    "paymentCurrencies" "PaymentCurrency"[] DEFAULT ARRAY[]::"PaymentCurrency"[],
    "minSalaryUsd" INTEGER,
    "defaultCover" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserApplyCriteria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklyCuratedBatch_userId_createdAt_idx" ON "WeeklyCuratedBatch"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "WeeklyCuratedBatch_status_idx" ON "WeeklyCuratedBatch"("status");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyCuratedBatch_userId_weekOf_key" ON "WeeklyCuratedBatch"("userId", "weekOf");

-- CreateIndex
CREATE INDEX "WeeklyCuratedItem_batchId_idx" ON "WeeklyCuratedItem"("batchId");

-- CreateIndex
CREATE INDEX "WeeklyCuratedItem_jobId_idx" ON "WeeklyCuratedItem"("jobId");

-- CreateIndex
CREATE INDEX "WeeklyCuratedItem_status_idx" ON "WeeklyCuratedItem"("status");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyCuratedItem_batchId_jobId_key" ON "WeeklyCuratedItem"("batchId", "jobId");

-- CreateIndex
CREATE UNIQUE INDEX "UserApplyCriteria_preferencesId_key" ON "UserApplyCriteria"("preferencesId");

-- CreateIndex
CREATE INDEX "Job_paymentCurrency_isActive_createdAt_idx" ON "Job"("paymentCurrency", "isActive", "createdAt");

-- CreateIndex
CREATE INDEX "Job_remotePolicy_isActive_createdAt_idx" ON "Job"("remotePolicy", "isActive", "createdAt");

-- CreateIndex
CREATE INDEX "UserPreferences_applyMode_idx" ON "UserPreferences"("applyMode");

-- CreateIndex
CREATE INDEX "resume_versions_resumeId_isTailored_createdAt_idx" ON "resume_versions"("resumeId", "isTailored", "createdAt");

-- CreateIndex
CREATE INDEX "resume_versions_tailoredJobId_idx" ON "resume_versions"("tailoredJobId");

-- AddForeignKey
ALTER TABLE "WeeklyCuratedBatch" ADD CONSTRAINT "WeeklyCuratedBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyCuratedItem" ADD CONSTRAINT "WeeklyCuratedItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "WeeklyCuratedBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyCuratedItem" ADD CONSTRAINT "WeeklyCuratedItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_versions" ADD CONSTRAINT "resume_versions_tailoredJobId_fkey" FOREIGN KEY ("tailoredJobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserApplyCriteria" ADD CONSTRAINT "UserApplyCriteria_preferencesId_fkey" FOREIGN KEY ("preferencesId") REFERENCES "UserPreferences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
