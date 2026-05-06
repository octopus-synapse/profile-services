-- P1-067 — record the deletion timestamp on soft-deleted comments.
-- The existing `isDeleted` boolean tells you the row is dead; this
-- column tells you when. Old rows stay NULL — backfill is optional
-- because the original deletion time isn't recoverable.
ALTER TABLE "PostComment" ADD COLUMN "deletedAt" TIMESTAMP(3);
