import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ConnectionService } from '@/bounded-contexts/social/services/connection.service';
import { FollowService } from '@/bounded-contexts/social/services/follow.service';
import { ValidationException } from '@/shared-kernel/exceptions/domain.exceptions';

// --- Types ---

interface TestResult {
  name: string;
  pass: boolean;
  detail: string;
  durationMs: number;
}

interface TestResults {
  [key: string]: unknown;
  suite: string;
  results: TestResult[];
  totalMs: number;
  passed: number;
  failed: number;
}

// --- Available Suites ---

const AVAILABLE_SUITES = ['seed-check', 'auth-flow', 'social-crud', 'onboarding-resume'] as const;

// --- Service ---

@Injectable()
export class TestRunnerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
    private readonly connectionService: ConnectionService,
    private readonly followService: FollowService,
  ) {}

  getAvailableSuites(): string[] {
    return [...AVAILABLE_SUITES];
  }

  async run(suite: string): Promise<TestResults> {
    this.logger.log(`Running test suite: ${suite}`, 'TestRunnerService');

    switch (suite) {
      case 'seed-check':
        return this.runSuite(suite, () => this.seedCheck());
      case 'auth-flow':
        return this.runSuite(suite, () => this.authFlow());
      case 'social-crud':
        return this.runSuite(suite, () => this.socialCrud());
      case 'onboarding-resume':
        return this.runSuite(suite, () => this.onboardingResume());
      default:
        throw new ValidationException(
          `Unknown suite "${suite}". Available: ${AVAILABLE_SUITES.join(', ')}`,
        );
    }
  }

  // ---------------------------------------------------------------------------
  // Suite runner wrapper
  // ---------------------------------------------------------------------------

  private async runSuite(suite: string, fn: () => Promise<TestResult[]>): Promise<TestResults> {
    const start = performance.now();
    const results = await fn();
    const totalMs = Math.round(performance.now() - start);
    const passed = results.filter((r) => r.pass).length;
    const failed = results.filter((r) => !r.pass).length;

    this.logger.log(
      `Suite "${suite}" finished: ${passed} passed, ${failed} failed (${totalMs}ms)`,
      'TestRunnerService',
    );

    return { suite, results, totalMs, passed, failed };
  }

  // ---------------------------------------------------------------------------
  // Test helper
  // ---------------------------------------------------------------------------

  private async runTest(name: string, fn: () => Promise<string>): Promise<TestResult> {
    const start = performance.now();
    try {
      const detail = await fn();
      return { name, pass: true, detail, durationMs: Math.round(performance.now() - start) };
    } catch (err) {
      return {
        name,
        pass: false,
        detail: String(err instanceof Error ? err.message : err),
        durationMs: Math.round(performance.now() - start),
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Suite: seed-check (read-only, no temp data)
  // ---------------------------------------------------------------------------

  private async seedCheck(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    results.push(
      await this.runTest('SectionType count', async () => {
        const count = await this.prisma.sectionType.count();
        if (count === 0) throw new Error('No SectionType records found');
        return `Section Types seeded (${count} records)`;
      }),
    );

    results.push(
      await this.runTest('OnboardingStep count', async () => {
        const count = await this.prisma.onboardingStep.count();
        if (count === 0) throw new Error('No OnboardingStep records found');
        return `Onboarding Steps seeded (${count} records)`;
      }),
    );

    results.push(
      await this.runTest('TechArea count', async () => {
        const count = await this.prisma.techArea.count();
        if (count === 0) throw new Error('No TechArea records found');
        return `Tech Areas seeded (${count} records)`;
      }),
    );

    results.push(
      await this.runTest('TechNiche count', async () => {
        const count = await this.prisma.techNiche.count();
        if (count === 0) throw new Error('No TechNiche records found');
        return `Tech Niches seeded (${count} records)`;
      }),
    );

    results.push(
      await this.runTest('TechSkill count', async () => {
        const count = await this.prisma.techSkill.count();
        if (count === 0) throw new Error('No TechSkill records found');
        return `Tech Skills seeded (${count} records)`;
      }),
    );

    results.push(
      await this.runTest('SpokenLanguage count', async () => {
        const count = await this.prisma.spokenLanguage.count();
        if (count === 0) throw new Error('No SpokenLanguage records found');
        return `Languages seeded (${count} records)`;
      }),
    );

    results.push(
      await this.runTest('ProgrammingLanguage count', async () => {
        const count = await this.prisma.programmingLanguage.count();
        if (count === 0) throw new Error('No ProgrammingLanguage records found');
        return `Programming Languages seeded (${count} records)`;
      }),
    );

    results.push(
      await this.runTest('User count', async () => {
        const count = await this.prisma.user.count();
        if (count === 0) throw new Error('No User records found');
        return `Users exist (${count} records)`;
      }),
    );

    return results;
  }

  // ---------------------------------------------------------------------------
  // Suite: auth-flow (temp data, cleaned up)
  // ---------------------------------------------------------------------------

  private async authFlow(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const timestamp = Date.now();
    const testEmail = `__test_${timestamp}@test.local`;
    const testPassword = 'TestP@ss123!';

    try {
      // 1. Create temp user
      results.push(
        await this.runTest('Create temp user', async () => {
          const hash = await Bun.password.hash(testPassword);
          await this.prisma.user.create({
            data: {
              email: testEmail,
              name: '__test_user',
              passwordHash: hash,
            },
          });
          return `Created user with email ${testEmail}`;
        }),
      );

      // 2. Verify user exists
      results.push(
        await this.runTest('Verify user exists', async () => {
          const user = await this.prisma.user.findUnique({
            where: { email: testEmail },
          });
          if (!user) throw new Error('User not found after creation');
          return `User found: ${user.id}`;
        }),
      );

      // 3. Verify password hash
      results.push(
        await this.runTest('Verify password hash', async () => {
          const user = await this.prisma.user.findUnique({
            where: { email: testEmail },
          });
          if (!user?.passwordHash) throw new Error('User or passwordHash not found');
          const valid = await Bun.password.verify(testPassword, user.passwordHash);
          if (!valid) throw new Error('Password verification failed');
          return 'Password hash verified successfully';
        }),
      );

      // 4. Delete temp user
      results.push(
        await this.runTest('Delete temp user', async () => {
          await this.prisma.user.deleteMany({
            where: { email: testEmail },
          });
          return `Deleted user with email ${testEmail}`;
        }),
      );

      // 5. Verify user is deleted
      results.push(
        await this.runTest('Verify user deleted', async () => {
          const user = await this.prisma.user.findUnique({
            where: { email: testEmail },
          });
          if (user) throw new Error('User still exists after deletion');
          return 'User successfully deleted';
        }),
      );
    } finally {
      await this.cleanupTestUsers();
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // Suite: social-crud (temp data, cleaned up)
  // ---------------------------------------------------------------------------

  private async socialCrud(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const timestamp = Date.now();
    const emailA = `__test_a_${timestamp}@test.local`;
    const emailB = `__test_b_${timestamp}@test.local`;
    let userAId = '';
    let userBId = '';

    try {
      // 1. Create 2 temp users
      results.push(
        await this.runTest('Create temp users', async () => {
          const hash = await Bun.password.hash('TestP@ss123!');
          const userA = await this.prisma.user.create({
            data: { email: emailA, name: '__test_userA', passwordHash: hash },
          });
          const userB = await this.prisma.user.create({
            data: { email: emailB, name: '__test_userB', passwordHash: hash },
          });
          userAId = userA.id;
          userBId = userB.id;
          return `Created userA (${userAId}) and userB (${userBId})`;
        }),
      );

      // 2. Follow: userA follows userB
      results.push(
        await this.runTest('Follow: A follows B', async () => {
          const follow = await this.followService.follow(userAId, userBId);
          return `Follow created: ${follow.id}`;
        }),
      );

      // 3. Verify follow exists
      results.push(
        await this.runTest('Verify follow exists', async () => {
          const isFollowing = await this.followService.isFollowing(userAId, userBId);
          if (!isFollowing) throw new Error('Follow relationship not found');
          return 'Follow relationship verified';
        }),
      );

      // 4. Unfollow: userA unfollows userB
      results.push(
        await this.runTest('Unfollow: A unfollows B', async () => {
          await this.followService.unfollow(userAId, userBId);
          const isFollowing = await this.followService.isFollowing(userAId, userBId);
          if (isFollowing) throw new Error('Follow still exists after unfollow');
          return 'Unfollow successful';
        }),
      );

      // 5. Connection: userA sends request to userB
      let connectionId = '';
      results.push(
        await this.runTest('Connection: A sends request to B', async () => {
          const connection = await this.connectionService.sendConnectionRequest(userAId, userBId);
          connectionId = connection.id;
          return `Connection request sent: ${connectionId}`;
        }),
      );

      // 6. Accept: userB accepts
      results.push(
        await this.runTest('Accept: B accepts connection', async () => {
          const connection = await this.connectionService.acceptConnection(connectionId, userBId);
          if (connection.status !== 'ACCEPTED')
            throw new Error('Connection status is not ACCEPTED');
          return 'Connection accepted';
        }),
      );

      // 7. Verify connected
      results.push(
        await this.runTest('Verify connected', async () => {
          const isConnected = await this.connectionService.isConnected(userAId, userBId);
          if (!isConnected) throw new Error('Users are not connected');
          return 'Connection verified';
        }),
      );

      // 8. Remove connection
      results.push(
        await this.runTest('Remove connection', async () => {
          await this.connectionService.removeConnection(connectionId, userAId);
          const isConnected = await this.connectionService.isConnected(userAId, userBId);
          if (isConnected) throw new Error('Connection still exists after removal');
          return 'Connection removed';
        }),
      );

      // 9. Cleanup
      results.push(
        await this.runTest('Cleanup temp users', async () => {
          await this.prisma.user.deleteMany({
            where: { email: { startsWith: '__test_' } },
          });
          return 'Temp users deleted';
        }),
      );
    } finally {
      await this.cleanupTestUsers();
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // Suite: onboarding-resume (temp data, cleaned up)
  // ---------------------------------------------------------------------------

  private async onboardingResume(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const timestamp = Date.now();
    const testEmail = `__test_resume_${timestamp}@test.local`;
    let userId = '';
    let resumeId = '';

    try {
      // 1. Create temp user
      results.push(
        await this.runTest('Create temp user', async () => {
          const hash = await Bun.password.hash('TestP@ss123!');
          const user = await this.prisma.user.create({
            data: { email: testEmail, name: '__test_resume_user', passwordHash: hash },
          });
          userId = user.id;
          return `Created user: ${userId}`;
        }),
      );

      // 2. Create resume for temp user
      results.push(
        await this.runTest('Create resume', async () => {
          const resume = await this.prisma.resume.create({
            data: {
              userId,
              title: '__test_resume',
            },
          });
          resumeId = resume.id;
          return `Created resume: ${resumeId}`;
        }),
      );

      // 3. Verify resume exists
      results.push(
        await this.runTest('Verify resume exists', async () => {
          const resume = await this.prisma.resume.findUnique({
            where: { id: resumeId },
          });
          if (!resume) throw new Error('Resume not found after creation');
          if (resume.userId !== userId) throw new Error('Resume userId mismatch');
          return `Resume verified: ${resume.id} belongs to user ${resume.userId}`;
        }),
      );

      // 4. Delete resume
      results.push(
        await this.runTest('Delete resume', async () => {
          await this.prisma.resume.delete({
            where: { id: resumeId },
          });
          const resume = await this.prisma.resume.findUnique({
            where: { id: resumeId },
          });
          if (resume) throw new Error('Resume still exists after deletion');
          return 'Resume deleted successfully';
        }),
      );

      // 5. Delete user
      results.push(
        await this.runTest('Delete temp user', async () => {
          await this.prisma.user.deleteMany({
            where: { email: testEmail },
          });
          return 'Temp user deleted';
        }),
      );
    } finally {
      await this.cleanupTestUsers();
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // Cleanup helper
  // ---------------------------------------------------------------------------

  private async cleanupTestUsers(): Promise<void> {
    try {
      // Delete resumes belonging to test users first (FK constraint)
      const testUsers = await this.prisma.user.findMany({
        where: { email: { startsWith: '__test_' } },
        select: { id: true },
      });
      const testUserIds = testUsers.map((u) => u.id);

      if (testUserIds.length > 0) {
        await this.prisma.resume.deleteMany({
          where: { userId: { in: testUserIds } },
        });
        await this.prisma.follow.deleteMany({
          where: {
            OR: [{ followerId: { in: testUserIds } }, { followingId: { in: testUserIds } }],
          },
        });
        await this.prisma.connection.deleteMany({
          where: {
            OR: [{ requesterId: { in: testUserIds } }, { targetId: { in: testUserIds } }],
          },
        });
      }

      await this.prisma.user.deleteMany({
        where: { email: { startsWith: '__test_' } },
      });
    } catch (err) {
      this.logger.warn(
        `Cleanup of __test_ users failed: ${String(err instanceof Error ? err.message : err)}`,
        'TestRunnerService',
      );
    }
  }
}
