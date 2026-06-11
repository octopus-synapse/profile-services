-- Job-title dictionary backing the Add Experience role autocomplete
-- (BC `roles`). Populated from ESCO / CBO / O*NET by `bun run roles:import`
-- (src/scripts/import-roles.ts). `normalizedLabel` is precomputed
-- (diacritic-stripped, lower-cased) so search never unaccents per row;
-- the trigram GIN index backs the contains tier of the ranked search.

-- CreateExtension (must be on the cluster allowlist — see
-- scripts/check-pg-extensions.ts)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "RoleTitleSource" AS ENUM ('ESCO', 'CBO', 'ONET');

-- CreateEnum
CREATE TYPE "RoleTitleLang" AS ENUM ('EN', 'PT');

-- CreateTable
CREATE TABLE "RoleTitle" (
    "id" TEXT NOT NULL DEFAULT uuidv7(),
    "label" TEXT NOT NULL,
    "normalizedLabel" TEXT NOT NULL,
    "lang" "RoleTitleLang" NOT NULL,
    "source" "RoleTitleSource" NOT NULL,
    "sourceId" TEXT,
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RoleTitle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoleTitle_lang_normalizedLabel_key" ON "RoleTitle"("lang", "normalizedLabel");

-- CreateIndex
CREATE INDEX "RoleTitle_lang_idx" ON "RoleTitle"("lang");

-- CreateIndex (raw — Prisma has no native gin_trgm_ops support)
CREATE INDEX "RoleTitle_normalizedLabel_trgm_idx"
  ON "RoleTitle" USING GIN ("normalizedLabel" gin_trgm_ops);
