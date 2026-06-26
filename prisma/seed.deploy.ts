/**
 * Deploy-time seed — runs on EVERY deploy via the container entrypoint
 * (`docker-entrypoint.sh`). It (re)applies the idempotent reference catalogs the
 * running app depends on, so a change to e.g. section-type field translations
 * reaches production without a manual reseed.
 *
 * The set is the SHARED bucket (prisma/seeds/shared) — the exact same list the
 * dev seed runs — plus the (currently empty) prod-only bucket. Because it runs
 * on every container start, everything here MUST be idempotent (upsert by key),
 * free of external I/O, and free of any per-row scaling cost. Dev fixtures,
 * external-API catalogs, admin/E2E users and table-scaling backfills live in
 * prisma/seeds/dev and are deliberately NOT run here.
 *
 * Failures are surfaced (exit 1) but the entrypoint treats them as non-fatal so
 * a seed bug never takes the API down.
 */
import { PrismaClient } from '@prisma/client';
import { createPrismaClientOptions } from '../src/bounded-contexts/platform/prisma/prisma-client-options';
import { runProdSeeds } from './seeds/prod';
import { runSharedSeeds } from './seeds/shared';

const prisma = new PrismaClient(createPrismaClientOptions());

async function main(): Promise<void> {
  console.log('🌱 [deploy-seed] applying shared reference catalogs…');
  await runSharedSeeds(prisma);
  await runProdSeeds();
  console.log('✅ [deploy-seed] reference catalogs up to date');
}

main()
  .catch((e) => {
    console.error('❌ [deploy-seed] failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
