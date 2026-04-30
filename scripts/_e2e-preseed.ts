/**
 * Pre-seed the e2e test database before sharded workers boot.
 *
 * Each `bun test` worker that boots the `TestApp` would otherwise
 * race on `seedTestCatalogs` (4 workers upserting permissions,
 * roles, languages, skills, etc. in parallel — Postgres handles it
 * but it's wasted work). Running once here, then setting
 * `E2E_SKIP_SEED=1` in the workers, drops total seed time from
 * "N × seed_time" to "1 × seed_time".
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { seedTestCatalogs } from '../test/infrastructure/shared/test-app';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL must be set for the pre-seed step');
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const start = Date.now();
await seedTestCatalogs(prisma);
await prisma.$disconnect();
console.log(`[preseed] catalogs ready in ${Date.now() - start}ms`);
