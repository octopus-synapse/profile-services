-- Curated seniority variants for the Add Experience role autocomplete
-- (BC `roles`). Adds the CURATED source + RoleSeniority level + the
-- seniority/baseRoleKey columns that the generator in
-- src/scripts/import-roles.ts (`--source=curated`) populates. Imported
-- occupational titles (ESCO/CBO/O*NET) leave both new columns null.
--
-- Safe to add CURATED and use it in the same migration only because this
-- file never inserts a CURATED row — the value is consumed at runtime by
-- the import script, in its own transaction.

-- AlterEnum
ALTER TYPE "RoleTitleSource" ADD VALUE 'CURATED';

-- CreateEnum
CREATE TYPE "RoleSeniority" AS ENUM ('INTERN', 'JUNIOR', 'MID', 'SENIOR', 'TRAINEE');

-- AlterTable
ALTER TABLE "RoleTitle"
  ADD COLUMN "seniority" "RoleSeniority",
  ADD COLUMN "baseRoleKey" TEXT;

-- CreateIndex
CREATE INDEX "RoleTitle_baseRoleKey_idx" ON "RoleTitle"("baseRoleKey");
