/*
  Warnings:

  - A unique constraint covering the columns `[resumeId,versionNumber]` on the table `resume_versions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `versionNumber` to the `resume_versions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "resume_versions" ADD COLUMN     "versionNumber" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "resume_versions_resumeId_versionNumber_key" ON "resume_versions"("resumeId", "versionNumber");
