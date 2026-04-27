/**
 * Pure-TS wiring for the test-runner BC. Zero `@nestjs/*` imports.
 *
 * `TestRunnerService` is a stateful Nest-decorated provider (it
 * extends `TestSuiteRunnerPort` and depends on Prisma + social
 * services), so the module constructs it once and passes it in as
 * the runner port.
 */

import { TestRunnerUseCases } from './application/ports/test-runner.port';
import { ListTestSuitesUseCase } from './application/use-cases/list-test-suites/list-test-suites.use-case';
import { RunTestSuiteUseCase } from './application/use-cases/run-test-suite/run-test-suite.use-case';
import type { TestSuiteRunnerPort } from './domain/ports/test-suite-runner.port';

export { TestRunnerUseCases };

export function buildTestRunnerUseCases(runner: TestSuiteRunnerPort): TestRunnerUseCases {
  return {
    runTestSuite: new RunTestSuiteUseCase(runner),
    listTestSuites: new ListTestSuitesUseCase(runner),
  };
}
