/**
 * Dispatches a smoke-test suite by name and returns the structured
 * results. Pure delegation — the runner port handles the suite
 * implementations.
 */

import {
  type TestResults,
  TestSuiteRunnerPort,
} from '../../../domain/ports/test-suite-runner.port';

export class RunTestSuiteUseCase {
  constructor(private readonly runner: TestSuiteRunnerPort) {}

  execute(suite: string): Promise<TestResults> {
    return this.runner.run(suite);
  }
}
