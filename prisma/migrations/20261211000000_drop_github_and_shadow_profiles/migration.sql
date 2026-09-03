-- GitHub integration and shadow profiles: sync, auto-sync, summary, claim —
-- no client. The import sources GitHub and JSON (raw JSON Resume upload) go
-- with them; PDF and LinkedIn stay.
DROP TABLE IF EXISTS "shadow_profiles";

DELETE FROM "ResumeImport" WHERE "source" IN ('JSON', 'GITHUB');
ALTER TYPE "ImportSource" RENAME TO "ImportSource_old";
CREATE TYPE "ImportSource" AS ENUM ('LINKEDIN', 'PDF', 'DOCX');
ALTER TABLE "ResumeImport"
  ALTER COLUMN "source" TYPE "ImportSource" USING ("source"::text::"ImportSource");
DROP TYPE "ImportSource_old";
