-- Social graph removal: follows, connections, activities, skill endorsements
-- and the skill-decay log — 33 routes, no client. `UserSkillProficiency`
-- stays: job-match readiness reads it.
DROP TABLE IF EXISTS "SkillEndorsement";
DROP TABLE IF EXISTS "skill_decay_logs";
DROP TABLE IF EXISTS "Connection";
DROP TABLE IF EXISTS "Activity";
DROP TABLE IF EXISTS "Follow";
DROP TYPE IF EXISTS "ConnectionStatus";
DROP TYPE IF EXISTS "ActivityType";

DELETE FROM "Notification"
WHERE "type" IN ('CONNECTION_REQUEST', 'CONNECTION_ACCEPTED', 'FOLLOW_NEW', 'SKILL_DECAY', 'CONNECTION_RECOMMENDATION');
DELETE FROM "NotificationPreference"
WHERE "type" IN ('CONNECTION_REQUEST', 'CONNECTION_ACCEPTED', 'FOLLOW_NEW', 'SKILL_DECAY', 'CONNECTION_RECOMMENDATION');

ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
CREATE TYPE "NotificationType" AS ENUM (
  'APPLICATION_STALE',
  'FIT_PROFILE_EXPIRED',
  'FIT_PROFILE_EXPIRY_REMINDER',
  'MATCH_RECOMMENDATIONS_READY',
  'RESUME_QUALITY_IMPROVED',
  'RESUME_QUALITY_REGRESSED',
  'MESSAGE_RECEIVED'
);
ALTER TABLE "Notification"
  ALTER COLUMN "type" TYPE "NotificationType" USING ("type"::text::"NotificationType");
ALTER TABLE "NotificationPreference"
  ALTER COLUMN "type" TYPE "NotificationType" USING ("type"::text::"NotificationType");
DROP TYPE "NotificationType_old";
