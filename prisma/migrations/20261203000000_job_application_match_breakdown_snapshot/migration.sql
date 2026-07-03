-- Freeze the Match Score breakdown (4 sub-scores + effective weights) on the
-- application alongside the existing overall snapshot, so "why did this match"
-- survives the Redis cache TTL. Additive + nullable, no backfill.

ALTER TABLE "JobApplication" ADD COLUMN "matchBreakdownSnapshot" JSONB;
