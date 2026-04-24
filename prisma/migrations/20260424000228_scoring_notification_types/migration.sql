-- scoring_notification_types: add 5 NotificationType enum values for the
-- scoring subsystem's lockout, reminder, recommendations, and quality
-- score boundary notifications. Idempotent via IF NOT EXISTS.

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FIT_PROFILE_EXPIRED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FIT_PROFILE_EXPIRY_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MATCH_RECOMMENDATIONS_READY';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RESUME_QUALITY_IMPROVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RESUME_QUALITY_REGRESSED';
