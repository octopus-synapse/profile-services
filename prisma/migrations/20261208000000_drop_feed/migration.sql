-- Feed removal (ADR on unused-surface removal). The social timeline — posts,
-- comments, likes, bookmarks, reports, poll votes — was fully built and had
-- no client: 20 routes, zero callers in the app. The bounded context, its
-- Prisma models and the notification types only it produced go together.
--
-- Children first, so the FKs do not block the parent.
DROP TABLE IF EXISTS "PollVote";
DROP TABLE IF EXISTS "PostReport";
DROP TABLE IF EXISTS "PostBookmark";
DROP TABLE IF EXISTS "PostLike";
DROP TABLE IF EXISTS "PostComment";
DROP TABLE IF EXISTS "Post";
DROP TYPE IF EXISTS "ReportStatus";

-- Postgres cannot drop a value from an enum in place; rebuild the type
-- without the feed-only values. Rows carrying them (notifications about
-- posts that no longer exist) are removed first — they point at nothing.
DELETE FROM "Notification"
WHERE "type" IN ('POST_LIKED', 'POST_COMMENTED', 'POST_REPOSTED', 'POST_BOOKMARKED', 'COMMENT_REPLIED');

ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
CREATE TYPE "NotificationType" AS ENUM (
  'CONNECTION_REQUEST',
  'CONNECTION_ACCEPTED',
  'FOLLOW_NEW',
  'SKILL_DECAY',
  'APPLICATION_STALE',
  'CONNECTION_RECOMMENDATION',
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
