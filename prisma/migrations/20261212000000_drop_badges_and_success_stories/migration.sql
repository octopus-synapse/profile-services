-- Badges and success stories: two small bounded contexts with no client.
-- (Career graph and recruiting had no tables of their own.)
DROP TABLE IF EXISTS "UserBadge";
DROP TABLE IF EXISTS "SuccessStory";
DROP TYPE IF EXISTS "BadgeKind";
DROP TYPE IF EXISTS "SuccessStoryStatus";
