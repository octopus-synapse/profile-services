import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { ConnectionService } from '@/bounded-contexts/social/services/connection.service';
import type { FollowService } from '@/bounded-contexts/social/services/follow.service';
import type { LoggerPort } from '@/shared-kernel';
import type { TestResult } from '../domain/ports/test-suite-runner.port';
import { cleanupTestUsers } from './cleanup.helper';
import { runTest } from './test-helpers';

export async function runSocialCrud(
  prisma: PrismaService,
  logger: LoggerPort,
  connectionService: ConnectionService,
  followService: FollowService,
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const timestamp = Date.now();
  const emailA = `__test_a_${timestamp}@test.local`;
  const emailB = `__test_b_${timestamp}@test.local`;
  let userAId = '';
  let userBId = '';

  try {
    results.push(
      await runTest(
        'Create temp users',
        async () => {
          const hash = await Bun.password.hash('TestP@ss123!');
          const userA = await prisma.user.create({
            data: { email: emailA, name: '__test_userA', passwordHash: hash },
          });
          const userB = await prisma.user.create({
            data: { email: emailB, name: '__test_userB', passwordHash: hash },
          });
          userAId = userA.id;
          userBId = userB.id;
          return `Created userA (${userAId}) and userB (${userBId})`;
        },
        logger,
      ),
    );

    results.push(
      await runTest(
        'Follow: A follows B',
        async () => {
          const follow = await followService.follow(userAId, userBId);
          return `Follow created: ${follow.id}`;
        },
        logger,
      ),
    );

    results.push(
      await runTest(
        'Verify follow exists',
        async () => {
          const isFollowing = await followService.isFollowing(userAId, userBId);
          if (!isFollowing) throw new Error('Follow relationship not found');
          return 'Follow relationship verified';
        },
        logger,
      ),
    );

    results.push(
      await runTest(
        'Unfollow: A unfollows B',
        async () => {
          await followService.unfollow(userAId, userBId);
          const isFollowing = await followService.isFollowing(userAId, userBId);
          if (isFollowing) throw new Error('Follow still exists after unfollow');
          return 'Unfollow successful';
        },
        logger,
      ),
    );

    let connectionId = '';
    results.push(
      await runTest(
        'Connection: A sends request to B',
        async () => {
          const connection = await connectionService.sendConnectionRequest(userAId, userBId);
          connectionId = connection.id;
          return `Connection request sent: ${connectionId}`;
        },
        logger,
      ),
    );

    results.push(
      await runTest(
        'Accept: B accepts connection',
        async () => {
          const connection = await connectionService.acceptConnection(connectionId, userBId);
          if (connection.status !== 'ACCEPTED')
            throw new Error('Connection status is not ACCEPTED');
          return 'Connection accepted';
        },
        logger,
      ),
    );

    results.push(
      await runTest(
        'Verify connected',
        async () => {
          const isConnected = await connectionService.isConnected(userAId, userBId);
          if (!isConnected) throw new Error('Users are not connected');
          return 'Connection verified';
        },
        logger,
      ),
    );

    results.push(
      await runTest(
        'Remove connection',
        async () => {
          await connectionService.removeConnection(connectionId, userAId);
          const isConnected = await connectionService.isConnected(userAId, userBId);
          if (isConnected) throw new Error('Connection still exists after removal');
          return 'Connection removed';
        },
        logger,
      ),
    );

    results.push(
      await runTest(
        'Cleanup temp users',
        async () => {
          await prisma.user.deleteMany({ where: { email: { startsWith: '__test_' } } });
          return 'Temp users deleted';
        },
        logger,
      ),
    );
  } finally {
    await cleanupTestUsers(prisma, logger);
  }

  return results;
}
