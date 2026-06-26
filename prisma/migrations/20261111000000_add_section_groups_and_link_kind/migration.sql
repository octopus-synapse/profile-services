-- Supersection grouping for the Profile redesign + the LinkKind enum that backs
-- the new links_v1 section. groupKey is a loose string (no FK) like
-- semanticKind — seed-managed. LinkKind values live in SectionItem.content JSON
-- (not a column) but exist as a Prisma enum so the i18n ENUM_DICTIONARY parity
-- can require labels for each value.
--
-- NOTE: `prisma migrate diff` also reports a `DROP INDEX
-- RoleTitle_normalizedLabel_trgm_idx`; that GIN/pg_trgm index is created by raw
-- SQL outside Prisma's datamodel and must be preserved — intentionally omitted.

-- CreateEnum
CREATE TYPE "LinkKind" AS ENUM ('LINKEDIN', 'GITHUB', 'WEBSITE', 'PORTFOLIO', 'CUSTOM');

-- AlterTable
ALTER TABLE "SectionType" ADD COLUMN     "groupKey" TEXT;

-- CreateTable
CREATE TABLE "SectionGroup" (
    "id" TEXT NOT NULL DEFAULT uuidv7(),
    "key" TEXT NOT NULL,
    "translations" JSONB NOT NULL DEFAULT '{}',
    "iconType" TEXT NOT NULL DEFAULT 'lucide',
    "icon" TEXT NOT NULL DEFAULT 'folder',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SectionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SectionGroup_key_key" ON "SectionGroup"("key");

-- CreateIndex
CREATE INDEX "SectionType_groupKey_idx" ON "SectionType"("groupKey");
