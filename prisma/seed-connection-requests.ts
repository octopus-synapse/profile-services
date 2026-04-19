/**
 * Seed: create N pending connection requests TO a target user
 * from existing seed_* users.
 *
 * Usage:
 *   bun run prisma/seed-connection-requests.ts
 *
 * Env:
 *   TARGET_EMAIL      (default: admin@example.com)
 *   REQUEST_COUNT     (default: 50)
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

const TARGET_EMAIL = process.env.TARGET_EMAIL || 'admin@example.com';
const REQUEST_COUNT = Number(process.env.REQUEST_COUNT ?? 50);

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function main() {
  console.log(`[seed-connection-requests] Target: ${TARGET_EMAIL}, count: ${REQUEST_COUNT}`);

  const target = await prisma.user.findFirst({
    where: { email: TARGET_EMAIL },
    select: { id: true, email: true, username: true },
  });

  if (!target) throw new Error(`Target user ${TARGET_EMAIL} not found`);

  const seedUsers = await prisma.user.findMany({
    where: {
      username: { startsWith: 'seed_' },
      id: { not: target.id },
    },
    select: { id: true, username: true },
  });

  console.log(`[seed-connection-requests] Found ${seedUsers.length} seed users`);

  if (seedUsers.length < REQUEST_COUNT) {
    console.warn(
      `[seed-connection-requests] Requested ${REQUEST_COUNT} but only ${seedUsers.length} seed users exist. Using all.`,
    );
  }

  const picked = shuffle(seedUsers).slice(0, REQUEST_COUNT);

  const existing = await prisma.connection.findMany({
    where: {
      targetId: target.id,
      requesterId: { in: picked.map((u) => u.id) },
    },
    select: { requesterId: true },
  });
  const existingSet = new Set(existing.map((c) => c.requesterId));

  const toCreate = picked.filter((u) => !existingSet.has(u.id));
  console.log(
    `[seed-connection-requests] ${existingSet.size} already exist, creating ${toCreate.length}`,
  );

  const result = await prisma.connection.createMany({
    data: toCreate.map((u) => ({
      requesterId: u.id,
      targetId: target.id,
      status: 'PENDING',
    })),
    skipDuplicates: true,
  });

  console.log(
    `[seed-connection-requests] ✅ Created ${result.count} pending requests for @${target.username}`,
  );
}

main()
  .catch((e) => {
    console.error('[seed-connection-requests] ❌', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
