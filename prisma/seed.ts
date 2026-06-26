/**
 * DEV database seed. Runs the shared reference catalogs + all dev fixtures.
 * Invoked by `make dev` (the dev compose runs this on startup), `prisma db seed`
 * and `migrate reset`. The shared set is reused verbatim by the deploy seed
 * (prisma/seed.deploy.ts) — see prisma/seeds/README.md.
 */
import { PrismaClient } from '@prisma/client';
import { createPrismaClientOptions } from '../src/bounded-contexts/platform/prisma/prisma-client-options';
import { runDevSeeds } from './seeds/dev';
import { seedAdminUser } from './seeds/dev/admin.seed';
import { runSharedSeeds } from './seeds/shared';

const prisma = new PrismaClient(createPrismaClientOptions());

async function main() {
  console.log('🌱 Starting database seed (shared + dev)…');

  await runSharedSeeds(prisma);
  const admin = await seedAdminUser(prisma);
  await runDevSeeds(prisma, { adminId: admin.id });

  console.log('✅ Database seed complete');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
