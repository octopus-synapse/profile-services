-- Q11 + Q74 (UUID v7 migration — staging step 1).
--
-- Installs the pg_uuidv7 extension so Prisma can use
--     @default(dbgenerated("uuidv7()"))
-- on every primary-key column.
--
-- THIS MIGRATION IS A FOUNDATION ONLY. The actual Prisma schema
-- swap (cuid → uuid v7) lives in a follow-up migration (see
-- prisma/migrations/README.md → "uuid v7 rollout"). Splitting the
-- two lets us deploy the extension separately and validate it on
-- staging without changing any model column.
--
-- Required Postgres version: 13+ (for the LSN-derived bytes).
-- Required deploy step: the extension must be installed by a
-- super-user. Most managed Postgres providers expose a
-- `CREATE EXTENSION` allowlist; pg_uuidv7 needs to be on it.

CREATE EXTENSION IF NOT EXISTS pg_uuidv7;

-- Sanity check — fail the migration if the extension didn't load.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_uuidv7'
  ) THEN
    RAISE EXCEPTION 'pg_uuidv7 extension is not installed. Ask infra to enable it.';
  END IF;
END$$;
