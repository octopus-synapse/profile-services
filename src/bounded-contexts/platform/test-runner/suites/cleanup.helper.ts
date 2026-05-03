import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';

const CTX = 'TestRunnerService';

export async function cleanupTestUsers(prisma: PrismaService, logger: LoggerPort): Promise<void> {
  try {
    const testUsers = await prisma.user.findMany({
      where: { email: { startsWith: '__test_' } },
      select: { id: true },
    });
    const testUserIds = testUsers.map((u) => u.id);

    if (testUserIds.length > 0) {
      await prisma.resume.deleteMany({ where: { userId: { in: testUserIds } } });
      await prisma.follow.deleteMany({
        where: {
          OR: [{ followerId: { in: testUserIds } }, { followingId: { in: testUserIds } }],
        },
      });
      await prisma.connection.deleteMany({
        where: {
          OR: [{ requesterId: { in: testUserIds } }, { targetId: { in: testUserIds } }],
        },
      });
    }

    await prisma.user.deleteMany({ where: { email: { startsWith: '__test_' } } });
  } catch (err) {
    logger.warn(
      `Cleanup of __test_ users failed: ${String(err instanceof Error ? err.message : err)}`,
      CTX,
    );
  }
}
