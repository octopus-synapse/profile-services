#!/usr/bin/env bun
/**
 * P0-011 CI gate.
 *
 * The PR includes the `20260503120000_install_pg_uuidv7` migration which
 * runs `CREATE EXTENSION pg_uuidv7`. Managed Postgres providers (RDS,
 * CloudSQL, Heroku) only allow extensions that operators have
 * pre-approved via the `shared_preload_libraries` allowlist; an
 * un-approved extension makes the migration fail at deploy time.
 *
 * This script runs in CI BEFORE `prisma migrate deploy` and asserts
 * that the target Postgres has `pg_uuidv7` available — both as a smoke
 * test of the migration itself and as a parity check that the same
 * extension allowlist exists in production. If CI passes this and
 * prod lacks the extension, the bug is in prod allowlist provisioning.
 *
 * Reads `DATABASE_URL` from env. Uses the Prisma client (already in
 * node_modules) to run the raw probe — avoids adding a `pg` dep just
 * for one query.
 */

import { PrismaClient } from '@prisma/client';

interface ExtensionRow {
  readonly name: string;
  readonly default_version: string;
}

async function main(): Promise<number> {
  if (!process.env.DATABASE_URL) {
    // eslint-disable-next-line no-console
    console.error('check-pg-extensions: DATABASE_URL not set');
    return 2;
  }

  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRaw<ExtensionRow[]>`
      SELECT name, default_version
        FROM pg_available_extensions
       WHERE name = 'pg_uuidv7'
    `;
    if (rows.length === 0) {
      // eslint-disable-next-line no-console
      console.error(
        'check-pg-extensions: pg_uuidv7 is NOT in pg_available_extensions.\n' +
          '  This Postgres cannot run the 20260503120000_install_pg_uuidv7 migration.\n' +
          '  Fix: add "pg_uuidv7" to the cluster\'s extension allowlist (shared_preload_libraries\n' +
          '  or the provider-specific equivalent). For local dev: install the extension via your\n' +
          '  package manager and restart Postgres.',
      );
      return 1;
    }
    // eslint-disable-next-line no-console
    console.log(
      `check-pg-extensions: pg_uuidv7 available (default_version=${rows[0].default_version}).`,
    );
    return 0;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      `check-pg-extensions: query failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return 2;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(`check-pg-extensions: unexpected error: ${err}`);
    process.exit(2);
  });
