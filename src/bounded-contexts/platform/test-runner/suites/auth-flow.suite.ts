import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { TestResult } from '../domain/ports/test-suite-runner.port';
import { cleanupTestUsers } from './cleanup.helper';
import { runTest } from './test-helpers';

export async function runAuthFlow(
  prisma: PrismaService,
  logger: LoggerPort,
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const testEmail = `__test_${Date.now()}@test.local`;
  const testPassword = 'TestP@ss123!';

  try {
    results.push(
      await runTest(
        'Create temp user',
        async () => {
          const hash = await Bun.password.hash(testPassword);
          await prisma.user.create({
            data: { email: testEmail, name: '__test_user', passwordHash: hash },
          });
          return `Created user with email ${testEmail}`;
        },
        logger,
      ),
    );

    results.push(
      await runTest(
        'Verify user exists',
        async () => {
          const user = await prisma.user.findUnique({ where: { email: testEmail } });
          if (!user) throw new Error('User not found after creation');
          return `User found: ${user.id}`;
        },
        logger,
      ),
    );

    results.push(
      await runTest(
        'Verify password hash',
        async () => {
          const user = await prisma.user.findUnique({ where: { email: testEmail } });
          if (!user?.passwordHash) throw new Error('User or passwordHash not found');
          const valid = await Bun.password.verify(testPassword, user.passwordHash);
          if (!valid) throw new Error('Password verification failed');
          return 'Password hash verified successfully';
        },
        logger,
      ),
    );

    results.push(
      await runTest(
        'Delete temp user',
        async () => {
          await prisma.user.deleteMany({ where: { email: testEmail } });
          return `Deleted user with email ${testEmail}`;
        },
        logger,
      ),
    );

    results.push(
      await runTest(
        'Verify user deleted',
        async () => {
          const user = await prisma.user.findUnique({ where: { email: testEmail } });
          if (user) throw new Error('User still exists after deletion');
          return 'User successfully deleted';
        },
        logger,
      ),
    );
  } finally {
    await cleanupTestUsers(prisma, logger);
  }

  return results;
}
