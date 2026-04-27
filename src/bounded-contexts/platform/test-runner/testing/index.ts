/**
 * In-memory `TestSuiteRunnerPort` for use case specs. Tests seed the
 * suite list and the result of each run; nothing touches Prisma.
 */

import { type TestResults, TestSuiteRunnerPort } from '../domain/ports/test-suite-runner.port';

export class InMemoryTestSuiteRunner extends TestSuiteRunnerPort {
  private suites: string[] = [];
  private nextResult: TestResults | null = null;
  readonly runs: string[] = [];

  seedSuites(suites: string[]): void {
    this.suites = [...suites];
  }

  seedNextRun(result: TestResults): void {
    this.nextResult = result;
  }

  getAvailableSuites(): string[] {
    return [...this.suites];
  }

  async run(suite: string): Promise<TestResults> {
    this.runs.push(suite);
    if (!this.nextResult) {
      return { suite, results: [], totalMs: 0, passed: 0, failed: 0 };
    }
    return this.nextResult;
  }
}
