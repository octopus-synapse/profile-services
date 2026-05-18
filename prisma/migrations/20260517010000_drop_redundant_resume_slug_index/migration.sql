-- P2-#34: drop the redundant `Resume_slug_idx`. The column is already
-- `@unique`, which Prisma maps to a `Resume_slug_key` unique index —
-- duplicating with a plain index added a write cost on every
-- INSERT/UPDATE that mentioned `slug` without any read benefit.

DROP INDEX IF EXISTS "Resume_slug_idx";
