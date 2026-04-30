-- CreateEnum
CREATE TYPE "ModifierEffect" AS ENUM ('DENY', 'GRANT');

-- CreateEnum
CREATE TYPE "ModifierType" AS ENUM ('SUSPEND_EMAIL_VERIFIED', 'SUSPEND_ONBOARDING', 'SUSPEND_ROLE_USER', 'SUSPEND_ROLE_ADMIN', 'GRANT_PERMISSION');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'ACCESS_MODIFIER_APPLIED';
ALTER TYPE "AuditAction" ADD VALUE 'ACCESS_MODIFIER_REVOKED';

-- DropForeignKey
ALTER TABLE "Group" DROP CONSTRAINT "Group_parentId_fkey";

-- DropForeignKey
ALTER TABLE "GroupPermission" DROP CONSTRAINT "GroupPermission_groupId_fkey";

-- DropForeignKey
ALTER TABLE "GroupPermission" DROP CONSTRAINT "GroupPermission_permissionId_fkey";

-- DropForeignKey
ALTER TABLE "GroupRole" DROP CONSTRAINT "GroupRole_groupId_fkey";

-- DropForeignKey
ALTER TABLE "GroupRole" DROP CONSTRAINT "GroupRole_roleId_fkey";

-- DropForeignKey
ALTER TABLE "UserGroup" DROP CONSTRAINT "UserGroup_groupId_fkey";

-- DropForeignKey
ALTER TABLE "UserGroup" DROP CONSTRAINT "UserGroup_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserPermission" DROP CONSTRAINT "UserPermission_permissionId_fkey";

-- DropForeignKey
ALTER TABLE "UserPermission" DROP CONSTRAINT "UserPermission_userId_fkey";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "roles" SET DEFAULT ARRAY[]::TEXT[];

-- DropTable
DROP TABLE "Group";

-- DropTable
DROP TABLE "GroupPermission";

-- DropTable
DROP TABLE "GroupRole";

-- DropTable
DROP TABLE "UserGroup";

-- DropTable
DROP TABLE "UserPermission";

-- CreateTable
CREATE TABLE "AccessModifier" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "modifierType" "ModifierType" NOT NULL,
    "effect" "ModifierEffect" NOT NULL,
    "permissionId" TEXT,
    "reason" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessModifier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccessModifier_userId_idx" ON "AccessModifier"("userId");

-- CreateIndex
CREATE INDEX "AccessModifier_userId_endsAt_revokedAt_idx" ON "AccessModifier"("userId", "endsAt", "revokedAt");

-- CreateIndex
CREATE INDEX "AccessModifier_modifierType_idx" ON "AccessModifier"("modifierType");

-- CreateIndex
CREATE INDEX "AccessModifier_permissionId_idx" ON "AccessModifier"("permissionId");

-- CreateIndex
CREATE INDEX "User_emailVerified_idx" ON "User"("emailVerified");

-- CreateIndex
CREATE INDEX "User_onboardingCompletedAt_idx" ON "User"("onboardingCompletedAt");

-- AddForeignKey
ALTER TABLE "AccessModifier" ADD CONSTRAINT "AccessModifier_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessModifier" ADD CONSTRAINT "AccessModifier_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

