-- Résumé analytics removal: view tracking, share analytics, the read-model
-- projections behind the analytics dashboard, and the weekly digest log —
-- 25 routes, no client. The weekly digest had nothing left to count once the
-- view events and follows were gone, so its idempotency log goes too.
-- `AnonymizedApplicationStat` stays: it is the LGPD erasure record, not
-- analytics.
DROP TABLE IF EXISTS "share_analytics";
DROP TABLE IF EXISTS "resume_view_events";
DROP TABLE IF EXISTS "resume_analytics";
DROP TABLE IF EXISTS "resume_views_daily";
DROP TABLE IF EXISTS "analytics_resume_projection";
DROP TABLE IF EXISTS "user_weekly_digest_logs";
DROP TYPE IF EXISTS "AnalyticsEvent";
