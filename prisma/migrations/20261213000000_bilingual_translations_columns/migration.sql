-- ADR-003 (revised): one Resume row, one canonical `language`, the derived
-- locale stored next to what it derives from — per item and per résumé —
-- with provenance. The three abandoned columns (never written by any create,
-- update or onboarding path; null for every real user) go.
ALTER TABLE "SectionItem" ADD COLUMN "translations" JSONB;
ALTER TABLE "Resume" ADD COLUMN "translations" JSONB;
ALTER TABLE "Resume" ADD COLUMN "headline" VARCHAR(120);

-- `User.headline` moves to the résumé it describes: the primary one, and any
-- résumé whose own headline is empty. `User.bio` already lives on
-- `Resume.summary` (onboarding wrote both) — fill summary where it is empty.
UPDATE "Resume" r
SET "headline" = u."headline"
FROM "User" u
WHERE r."userId" = u."id" AND r."headline" IS NULL AND u."headline" IS NOT NULL;

UPDATE "Resume" r
SET "summary" = u."bio"
FROM "User" u
WHERE r."userId" = u."id" AND (r."summary" IS NULL OR r."summary" = '') AND u."bio" IS NOT NULL;

DROP INDEX IF EXISTS "Resume_primaryLanguage_idx";
ALTER TABLE "Resume" DROP COLUMN IF EXISTS "contentPtBr";
ALTER TABLE "Resume" DROP COLUMN IF EXISTS "contentEn";
ALTER TABLE "Resume" DROP COLUMN IF EXISTS "primaryLanguage";
