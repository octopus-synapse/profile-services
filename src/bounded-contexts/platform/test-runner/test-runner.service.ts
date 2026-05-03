import { InvalidTestSuiteException } from '@/bounded-contexts/platform/common/exceptions/platform.exceptions';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { ConnectionService } from '@/bounded-contexts/social/services/connection.service';
import type { FollowService } from '@/bounded-contexts/social/services/follow.service';
import type { LoggerPort } from '@/shared-kernel';
import {
  type TestResult,
  type TestResults,
  TestSuiteRunnerPort,
} from './domain/ports/test-suite-runner.port';
import { runAuthFlow } from './suites/auth-flow.suite';
import { runOnboardingResume } from './suites/onboarding-resume.suite';
import { runSeedCheck } from './suites/seed-check.suite';
import { runSocialCrud } from './suites/social-crud.suite';

const CTX = 'TestRunnerService';
const AVAILABLE_SUITES = ['seed-check', 'auth-flow', 'social-crud', 'onboarding-resume'] as const;

export class TestRunnerService extends TestSuiteRunnerPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
    private readonly connectionService: ConnectionService,
    private readonly followService: FollowService,
  ) {
    super();
  }

  getAvailableSuites(): string[] {
    return [...AVAILABLE_SUITES];
  }

  async run(suite: string): Promise<TestResults> {
    this.logger.log(`Running test suite: ${suite}`, CTX);
    switch (suite) {
      case 'seed-check':
        return this.runSuite(suite, () => runSeedCheck(this.prisma, this.logger));
      case 'auth-flow':
        return this.runSuite(suite, () => runAuthFlow(this.prisma, this.logger));
      case 'social-crud':
        return this.runSuite(suite, () =>
          runSocialCrud(this.prisma, this.logger, this.connectionService, this.followService),
        );
      case 'onboarding-resume':
        return this.runSuite(suite, () => runOnboardingResume(this.prisma, this.logger));
      default:
        throw new InvalidTestSuiteException(suite, AVAILABLE_SUITES);
    }
  }

  private async runSuite(suite: string, fn: () => Promise<TestResult[]>): Promise<TestResults> {
    const start = performance.now();
    const results = await fn();
    const totalMs = Math.round(performance.now() - start);
    const passed = results.filter((r) => r.pass).length;
    const failed = results.filter((r) => !r.pass).length;
    this.logger.log(
      `Suite "${suite}" finished: ${passed} passed, ${failed} failed (${totalMs}ms)`,
      CTX,
    );
    return { suite, results, totalMs, passed, failed };
  }
}
