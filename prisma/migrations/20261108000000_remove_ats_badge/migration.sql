-- Retire the content-based ATS score: drop the ATS_90_PLUS badge.
-- Existing awards are removed (the achievement no longer exists), then the
-- enum value is dropped via the Postgres recreate-type dance.

DELETE FROM "UserBadge" WHERE "kind" = 'ATS_90_PLUS';

ALTER TYPE "BadgeKind" RENAME TO "BadgeKind_old";

CREATE TYPE "BadgeKind" AS ENUM (
    'FIRST_BUILD',
    'MENTORED_10',
    'INTERVIEWS_5',
    'CONTRIBUTOR',
    'EVENT_SPEAKER'
);

ALTER TABLE "UserBadge"
    ALTER COLUMN "kind" TYPE "BadgeKind" USING ("kind"::text::"BadgeKind");

DROP TYPE "BadgeKind_old";
