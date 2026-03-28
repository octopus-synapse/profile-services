-- CreateTable: Generic Sections System
-- This migration creates the core tables for the generic sections architecture.

-- SectionType: Defines the structure and metadata for each section type
CREATE TABLE "SectionType" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "semanticKind" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "isRepeatable" BOOLEAN NOT NULL DEFAULT true,
    "minItems" INTEGER NOT NULL DEFAULT 0,
    "maxItems" INTEGER,
    "definition" JSONB NOT NULL,
    "uiSchema" JSONB,
    "renderHints" JSONB NOT NULL DEFAULT '{}',
    "fieldStyles" JSONB NOT NULL DEFAULT '{}',
    "iconType" TEXT NOT NULL DEFAULT 'emoji',
    "icon" TEXT NOT NULL DEFAULT '📄',
    "translations" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SectionType_pkey" PRIMARY KEY ("id")
);

-- ResumeSection: Links a resume to a section type with ordering
CREATE TABLE "ResumeSection" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "sectionTypeId" TEXT NOT NULL,
    "titleOverride" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeSection_pkey" PRIMARY KEY ("id")
);

-- SectionItem: Individual items within a section
CREATE TABLE "SectionItem" (
    "id" TEXT NOT NULL,
    "resumeSectionId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SectionType_key_key" ON "SectionType"("key");
CREATE UNIQUE INDEX "SectionType_slug_version_key" ON "SectionType"("slug", "version");
CREATE INDEX "SectionType_semanticKind_idx" ON "SectionType"("semanticKind");
CREATE INDEX "SectionType_isActive_idx" ON "SectionType"("isActive");

CREATE UNIQUE INDEX "ResumeSection_resumeId_sectionTypeId_key" ON "ResumeSection"("resumeId", "sectionTypeId");
CREATE INDEX "ResumeSection_resumeId_order_idx" ON "ResumeSection"("resumeId", "order");
CREATE INDEX "ResumeSection_sectionTypeId_idx" ON "ResumeSection"("sectionTypeId");

CREATE INDEX "SectionItem_resumeSectionId_order_idx" ON "SectionItem"("resumeSectionId", "order");
CREATE INDEX "SectionItem_resumeSectionId_idx" ON "SectionItem"("resumeSectionId");

-- AddForeignKey
ALTER TABLE "ResumeSection" ADD CONSTRAINT "ResumeSection_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResumeSection" ADD CONSTRAINT "ResumeSection_sectionTypeId_fkey" FOREIGN KEY ("sectionTypeId") REFERENCES "SectionType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SectionItem" ADD CONSTRAINT "SectionItem_resumeSectionId_fkey" FOREIGN KEY ("resumeSectionId") REFERENCES "ResumeSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
