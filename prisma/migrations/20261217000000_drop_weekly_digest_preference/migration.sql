-- The weekly digest job was removed with the analytics surface (ADR-005);
-- the preference has had nothing to switch off since.
ALTER TABLE "UserPreferences" DROP COLUMN "weeklyDigest";
