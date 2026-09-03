-- ADR-003 §7: headline and bio live on the résumé. Carry over whatever the
-- primary résumé is still missing, then drop the user columns.
UPDATE "Resume" AS r
SET "headline" = COALESCE(r."headline", u."headline"),
    "summary"  = COALESCE(r."summary",  u."bio")
FROM "User" AS u
WHERE u."primaryResumeId" = r."id"
  AND (r."headline" IS NULL OR r."summary" IS NULL);

ALTER TABLE "User" DROP COLUMN "bio";
ALTER TABLE "User" DROP COLUMN "headline";
