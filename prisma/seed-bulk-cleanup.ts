/**
 * Cleanup for seed-bulk.ts — removes all seed users and cascades.
 * Run: bun run prisma/seed-bulk-cleanup.ts
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const SEED_PREFIX = 'seed_';

async function main() {
  console.log('[cleanup] Removing seed users and all related data...');

  const users = await prisma.user.findMany({
    where: { username: { startsWith: SEED_PREFIX } },
    select: { id: true },
  });

  if (users.length === 0) {
    console.log('[cleanup] No seed users found. Nothing to do.');
    return;
  }

  const userIds = users.map((u) => u.id);
  console.log(`[cleanup] Found ${userIds.length} seed users`);

  // Delete in order to respect FKs (most models cascade via onDelete, but be explicit)
  await prisma.pollVote.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.postBookmark.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.postLike.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.postReport.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.postComment.deleteMany({ where: { authorId: { in: userIds } } });
  await prisma.post.deleteMany({ where: { authorId: { in: userIds } } });
  await prisma.follow.deleteMany({
    where: { OR: [{ followerId: { in: userIds } }, { followingId: { in: userIds } }] },
  });
  await prisma.connection.deleteMany({
    where: { OR: [{ requesterId: { in: userIds } }, { targetId: { in: userIds } }] },
  });
  await prisma.notification.deleteMany({
    where: { OR: [{ userId: { in: userIds } }, { actorId: { in: userIds } }] },
  });
  await prisma.resumeAnalytics.deleteMany({
    where: { resume: { userId: { in: userIds } } },
  });
  await prisma.sectionItem.deleteMany({
    where: { resumeSection: { resume: { userId: { in: userIds } } } },
  });
  await prisma.resumeSection.deleteMany({
    where: { resume: { userId: { in: userIds } } },
  });
  await prisma.resume.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.userPreferences.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.onboardingProgress.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });

  console.log(`[cleanup] ✅ Removed ${userIds.length} seed users and all related data`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('[cleanup] ❌ Error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
