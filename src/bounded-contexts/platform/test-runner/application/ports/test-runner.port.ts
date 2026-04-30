/**
 * Bundle token for the test-runner BC. Doubles as the TypeScript
 * shape of the use-case bag and the Nest DI token. Composition lives
 * in `test-runner.composition.ts` — Nest-free.
 */

import type { ListTestSuitesUseCase } from '../use-cases/list-test-suites/list-test-suites.use-case';
import type { RunTestSuiteUseCase } from '../use-cases/run-test-suite/run-test-suite.use-case';

export abstract class TestRunnerUseCases {
  abstract readonly runTestSuite: RunTestSuiteUseCase;
  abstract readonly listTestSuites: ListTestSuitesUseCase;
}
