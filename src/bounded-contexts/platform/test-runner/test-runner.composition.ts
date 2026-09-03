/**
 * Pure-TS wiring for the test-runner BC. Zero `@nestjs/*` imports.
 *
 * The runner itself (`TestRunnerService`) is now a POJO that extends
 * `TestSuiteRunnerPort` and depends on Prisma. The
 * Phase-1 contract returns `BoundedContextComposition<TestRunnerUseCases>`
 * for the bootstrap to consume.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import { TestRunnerUseCases } from './application/ports/test-runner.port';
import { ListTestSuitesUseCase } from './application/use-cases/list-test-suites/list-test-suites.use-case';
import { RunTestSuiteUseCase } from './application/use-cases/run-test-suite/run-test-suite.use-case';
import type { TestSuiteRunnerPort } from './domain/ports/test-suite-runner.port';
import { testRunnerRoutes } from './test-runner.routes';
import { TestRunnerService } from './test-runner.service';

export { TestRunnerUseCases };

export function buildTestRunnerUseCases(runner: TestSuiteRunnerPort): TestRunnerUseCases {
  return {
    runTestSuite: new RunTestSuiteUseCase(runner),
    listTestSuites: new ListTestSuitesUseCase(runner),
  };
}

export function buildTestRunnerComposition(
  prisma: PrismaService,
  logger: LoggerPort,
): BoundedContextComposition<TestRunnerUseCases> {
  const runner = new TestRunnerService(prisma, logger);
  const useCases = buildTestRunnerUseCases(runner);

  return {
    useCases,
    routes: testRunnerRoutes,
  };
}
