-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'APPROVER');

-- AlterTable
ALTER TABLE "Resume" ADD COLUMN     "primaryStack" TEXT[],
ADD COLUMN     "techArea" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");
