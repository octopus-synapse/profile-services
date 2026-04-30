import { describe, expect, it } from 'bun:test';
import { InMemoryTestSuiteRunner } from '../../../testing';
import { ListTestSuitesUseCase } from './list-test-suites.use-case';

describe('ListTestSuitesUseCase', () => {
  it('returns the suite list reported by the runner', () => {
    const runner = new InMemoryTestSuiteRunner();
    runner.seedSuites(['seed-check', 'auth-flow']);
    const useCase = new ListTestSuitesUseCase(runner);

    expect(useCase.execute()).toEqual(['seed-check', 'auth-flow']);
  });
});
