-- UUIDv7 EVERYWHERE — covers every primary-key column the previous
-- `20260503130000_swap_id_defaults_to_uuidv7` migration missed.
--
-- The earlier swap was hand-enumerated and silently fell out of sync
-- with the schema (RolePermission, FitAnswer, OnboardingStep and ~54
-- other tables ended up with a NULL default — every INSERT had to
-- supply an id explicitly, which the seeders did not, so seeding
-- failed at first run).
--
-- This migration walks `information_schema` and sets
-- `DEFAULT uuidv7()::text` on every `id text NOT NULL` column in the
-- `public` schema that doesn't already carry a default. Idempotent.
--
-- The companion `uuidv7()` SQL alias around `pg_uuidv7.uuid_generate_v7()`
-- is bootstrapped by the dev Postgres image's init script
-- (`infra/docker/postgres/init/00-extensions.sql`); production
-- Postgres deploys must expose the same alias.

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT table_name
      FROM information_schema.columns
     WHERE column_name = 'id'
       AND table_schema = 'public'
       AND data_type = 'text'
       AND column_default IS NULL
       AND is_nullable = 'NO'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I ALTER COLUMN "id" SET DEFAULT uuidv7()::text',
      rec.table_name
    );
  END LOOP;
END$$;
