-- Init script for the dev Postgres image.
-- Runs once on a fresh data volume (Postgres native
-- /docker-entrypoint-initdb.d hook).
--
-- Installs the two extensions Prisma migrations rely on, and exposes
-- a `uuidv7()` alias for the `pg_uuidv7` function. The fboulnois
-- build of pg_uuidv7 ships `uuid_generate_v7()` while the project's
-- migrations call `uuidv7()` — keep both names live so either form
-- resolves at migration time.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_uuidv7;

CREATE OR REPLACE FUNCTION uuidv7()
RETURNS uuid
LANGUAGE sql
VOLATILE
AS $$
  SELECT uuid_generate_v7();
$$;
