/**
 * Idempotent re-seed of the section-type catalog (definitions + translations).
 *
 * Run after changing prisma/seeds/shared/section-type.seed.ts or the translation
 * seeds — the runtime now resolves labels with NO fallback, so the DB must
 * carry the current, fully-translated catalog or requests throw.
 *
 * Safe to run repeatedly: `seedSectionTypes` upserts by `key`. It also fails
 * loud — if any catalog section type or visible field lacks a translation,
 * the seed throws instead of writing a partially-translated row.
 *
 *   bun run prisma:reseed-section-types
 */

import { PrismaClient } from '@prisma/client';
import { createPrismaClientOptions } from '../src/bounded-contexts/platform/prisma/prisma-client-options';
import { seedSectionTypes } from './seeds/shared/section-type.seed';

const prisma = new PrismaClient(createPrismaClientOptions());

async function main(): Promise<void> {
  console.log('🧩 Re-seeding section types (idempotent)...');
  await seedSectionTypes(prisma);
  console.log('✅ Section types re-seeded.');
}

main()
  .catch((err) => {
    console.error('❌ Section-type re-seed failed:', err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
