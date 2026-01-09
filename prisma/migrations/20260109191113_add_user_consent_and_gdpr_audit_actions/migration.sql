-- CreateEnum
CREATE TYPE "ConsentDocumentType" AS ENUM ('TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'MARKETING_CONSENT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'USER_LOGIN';
ALTER TYPE "AuditAction" ADD VALUE 'USER_LOGOUT';
ALTER TYPE "AuditAction" ADD VALUE 'TOS_ACCEPTED';
ALTER TYPE "AuditAction" ADD VALUE 'PRIVACY_POLICY_ACCEPTED';
ALTER TYPE "AuditAction" ADD VALUE 'DATA_EXPORT_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE 'DATA_EXPORT_DOWNLOADED';
ALTER TYPE "AuditAction" ADD VALUE 'ROLE_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'TWO_FACTOR_ENABLED';
ALTER TYPE "AuditAction" ADD VALUE 'TWO_FACTOR_DISABLED';

-- CreateTable
CREATE TABLE "UserConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentType" "ConsentDocumentType" NOT NULL,
    "version" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "UserConsent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserConsent_userId_documentType_idx" ON "UserConsent"("userId", "documentType");

-- CreateIndex
CREATE INDEX "UserConsent_acceptedAt_idx" ON "UserConsent"("acceptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserConsent_userId_documentType_version_key" ON "UserConsent"("userId", "documentType", "version");

-- AddForeignKey
ALTER TABLE "UserConsent" ADD CONSTRAINT "UserConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
