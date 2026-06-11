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
 * that the target Postgres has every extension our migrations create
 * (`REQUIRED_EXTENSIONS` below) available — both as a smoke
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

/** Extensions our migrations `CREATE EXTENSION`, with the migration that needs them. */
const REQUIRED_EXTENSIONS: ReadonlyArray<{ name: string; migration: string }> = [
  { name: 'pg_uuidv7', migration: '20260503120000_install_pg_uuidv7' },
  { name: 'pg_trgm', migration: '20260610000000_add_role_titles' },
];

async function main(): Promise<number> {
  if (!process.env.DATABASE_URL) {
    // eslint-disable-next-line no-console
    console.error('check-pg-extensions: DATABASE_URL not set');
    return 2;
  }

  const prisma = new PrismaClient();
  try {
    const names = REQUIRED_EXTENSIONS.map((e) => e.name);
    const rows = await prisma.$queryRaw<ExtensionRow[]>`
      SELECT name, default_version
        FROM pg_available_extensions
       WHERE name = ANY(${names})
    `;
    const available = new Map(rows.map((r) => [r.name, r.default_version]));
    const missing = REQUIRED_EXTENSIONS.filter((e) => !available.has(e.name));
    if (missing.length > 0) {
      for (const ext of missing) {
        // eslint-disable-next-line no-console
        console.error(
          `check-pg-extensions: ${ext.name} is NOT in pg_available_extensions.\n` +
            `  This Postgres cannot run the ${ext.migration} migration.\n` +
            `  Fix: add "${ext.name}" to the cluster's extension allowlist (shared_preload_libraries\n` +
            '  or the provider-specific equivalent). For local dev: install the extension via your\n' +
            '  package manager and restart Postgres.',
        );
      }
      return 1;
    }
    for (const ext of REQUIRED_EXTENSIONS) {
      // eslint-disable-next-line no-console
      console.log(
        `check-pg-extensions: ${ext.name} available (default_version=${available.get(ext.name)}).`,
      );
    }
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
