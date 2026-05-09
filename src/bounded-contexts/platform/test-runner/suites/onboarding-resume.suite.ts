import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { TestResult } from '../domain/ports/test-suite-runner.port';
import { cleanupTestUsers } from './cleanup.helper';
import { runTest } from './test-helpers';

export async function runOnboardingResume(
  prisma: PrismaService,
  logger: LoggerPort,
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const testEmail = `__test_resume_${Date.now()}@test.local`;
  let userId = '';
  let resumeId = '';

  try {
    results.push(
      await runTest(
        'Create temp user',
        async () => {
          const hash = await Bun.password.hash('TestP@ss123!');
          const user = await prisma.user.create({
            data: { email: testEmail, name: '__test_resume_user', passwordHash: hash },
          });
          userId = user.id;
          return `Created user: ${userId}`;
        },
        logger,
      ),
    );

    results.push(
      await runTest(
        'Create resume',
        async () => {
          const resume = await prisma.resume.create({ data: { userId, title: '__test_resume' } });
          resumeId = resume.id;
          return `Created resume: ${resumeId}`;
        },
        logger,
      ),
    );

    results.push(
      await runTest(
        'Verify resume exists',
        async () => {
          const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
          if (!resume) throw new Error('Resume not found after creation');
          if (resume.userId !== userId) throw new Error('Resume userId mismatch');
          return `Resume verified: ${resume.id} belongs to user ${resume.userId}`;
        },
        logger,
      ),
    );

    results.push(
      await runTest(
        'Delete resume',
        async () => {
          await prisma.resume.delete({ where: { id: resumeId } });
          const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
          if (resume) throw new Error('Resume still exists after deletion');
          return 'Resume deleted successfully';
        },
        logger,
      ),
    );

    results.push(
      await runTest(
        'Delete temp user',
        async () => {
          await prisma.user.deleteMany({ where: { email: testEmail } });
          return 'Temp user deleted';
        },
        logger,
      ),
    );
  } finally {
    await cleanupTestUsers(prisma, logger);
  }

  return results;
}
