-- First copy displayName to name where name is null
UPDATE "User" SET "name" = "displayName" WHERE "name" IS NULL AND "displayName" IS NOT NULL;
ALTER TABLE "User" DROP COLUMN "displayName";
