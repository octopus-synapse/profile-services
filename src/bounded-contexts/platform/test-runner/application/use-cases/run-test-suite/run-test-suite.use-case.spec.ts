import { describe, expect, it } from 'bun:test';
import { InMemoryTestSuiteRunner } from '../../../testing';
import { RunTestSuiteUseCase } from './run-test-suite.use-case';

describe('RunTestSuiteUseCase', () => {
  it('dispatches the suite name to the runner and forwards the result', async () => {
    const runner = new InMemoryTestSuiteRunner();
    runner.seedNextRun({
      suite: 'seed-check',
      results: [{ name: 'rows', pass: true, detail: 'ok', durationMs: 5 }],
      totalMs: 5,
      passed: 1,
      failed: 0,
    });
    const useCase = new RunTestSuiteUseCase(runner);

    const result = await useCase.execute('seed-check');

    expect(runner.runs).toEqual(['seed-check']);
    expect(result.passed).toBe(1);
  });
});
