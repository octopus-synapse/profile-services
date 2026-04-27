/**
 * Outbound port for the smoke-test suite runner. The use cases never
 * see Prisma or the social services — they ask for the suite list or
 * dispatch a run by name; the adapter (`TestRunnerService`) owns the
 * actual orchestration.
 */

export interface TestResult {
  readonly name: string;
  readonly pass: boolean;
  readonly detail: string;
  readonly durationMs: number;
}

export interface TestResults {
  readonly suite: string;
  readonly results: TestResult[];
  readonly totalMs: number;
  readonly passed: number;
  readonly failed: number;
}

export abstract class TestSuiteRunnerPort {
  abstract getAvailableSuites(): string[];
  abstract run(suite: string): Promise<TestResults>;
}
