-- AddBilingualSupport
-- Adds bilingual content storage for resume sections

-- Add bilingual content fields to Resume
ALTER TABLE "Resume" ADD COLUMN "contentPtBr" JSONB;
ALTER TABLE "Resume" ADD COLUMN "contentEn" JSONB;
ALTER TABLE "Resume" ADD COLUMN "primaryLanguage" TEXT NOT NULL DEFAULT 'pt-br';

-- Create index for language queries
CREATE INDEX "Resume_primaryLanguage_idx" ON "Resume"("primaryLanguage");

-- Add a comment explaining the bilingual system
COMMENT ON COLUMN "Resume"."contentPtBr" IS 'Complete resume content in Brazilian Portuguese stored as JSON';
COMMENT ON COLUMN "Resume"."contentEn" IS 'Complete resume content in English stored as JSON (auto-translated from PT-BR)';
COMMENT ON COLUMN "Resume"."primaryLanguage" IS 'Primary language of the resume (pt-br or en)';
