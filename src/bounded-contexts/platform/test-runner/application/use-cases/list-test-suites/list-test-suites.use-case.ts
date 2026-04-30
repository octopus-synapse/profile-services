/**
 * Returns the list of test suite names the runner can dispatch.
 */

import { TestSuiteRunnerPort } from '../../../domain/ports/test-suite-runner.port';

export class ListTestSuitesUseCase {
  constructor(private readonly runner: TestSuiteRunnerPort) {}

  execute(): string[] {
    return this.runner.getAvailableSuites();
  }
}
