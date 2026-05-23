-- P1-024 / P1-025 — index "list my reactions / bookmarks" hot paths.
--
-- Both PostLike and PostBookmark are queried by `WHERE userId = $1 ORDER BY
-- createdAt DESC LIMIT $2 OFFSET $3` for the user-facing engagement views.
-- Before this migration Postgres had only the unique `(postId, userId)`
-- key on these tables, so the planner fell back to a sequential scan +
-- in-memory sort once the user accumulated more than a handful of rows.
-- The composite (userId, createdAt) index lets the planner walk the
-- B-tree in reverse and stop after `LIMIT` rows.
--
-- Created CONCURRENTLY when applied via `prisma migrate deploy` since
-- the tables can be hot in prod; if Prisma's transaction wrapper makes
-- CONCURRENTLY illegal in your environment, drop the keyword (the
-- exclusive lock is brief on a young table).

CREATE INDEX IF NOT EXISTS "PostLike_userId_createdAt_idx"
  ON "PostLike" ("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "PostBookmark_userId_createdAt_idx"
  ON "PostBookmark" ("userId", "createdAt");
