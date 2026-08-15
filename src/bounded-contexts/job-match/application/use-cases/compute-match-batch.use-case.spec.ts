import { describe, expect, it } from 'bun:test';
import type { LoggerPort } from '@/shared-kernel';
import type { UserFitStatePort } from '../../domain/ports/user-fit-state.port';
import type { ComputeMatchUseCase } from './compute-match.use-case';
import { ComputeMatchBatchUseCase } from './compute-match-batch.use-case';

const logger = { debug() {}, log() {}, warn() {}, error() {} } as unknown as LoggerPort;

const fitState = (status: string): UserFitStatePort =>
  ({ getStatus: async () => ({ status }) }) as unknown as UserFitStatePort;

function stubComputeMatch(scoresByJob: Record<string, number>): {
  useCase: ComputeMatchUseCase;
  calls: string[];
} {
  const calls: string[] = [];
  const useCase = {
    execute: async ({ jobId }: { jobId: string }) => {
      calls.push(jobId);
      const score = scoresByJob[jobId];
      if (score === undefined) throw new Error(`no score for ${jobId}`);
      return { overallScore: score };
    },
  } as unknown as ComputeMatchUseCase;
  return { useCase, calls };
}

const input = (jobIds: string[]) => ({ userId: 'u1', resumeId: 'r1', jobIds });

describe('ComputeMatchBatchUseCase', () => {
  it('scores every job, preserving request order and mapping ranks', async () => {
    const { useCase } = stubComputeMatch({ j1: 92, j2: 61, j3: 78 });
    const batch = new ComputeMatchBatchUseCase(useCase, fitState('responded'), logger);
    const result = await batch.execute(input(['j3', 'j1', 'j2']));
    expect(result.scores).toEqual([
      { jobId: 'j3', overallScore: 78, rank: 'B' },
      { jobId: 'j1', overallScore: 92, rank: 'S' },
      { jobId: 'j2', overallScore: 61, rank: 'C' },
    ]);
  });

  it('dedupes repeated job ids before computing', async () => {
    const { useCase, calls } = stubComputeMatch({ j1: 80 });
    const batch = new ComputeMatchBatchUseCase(useCase, fitState('responded'), logger);
    const result = await batch.execute(input(['j1', 'j1', 'j1']));
    expect(calls).toEqual(['j1']);
    expect(result.scores).toHaveLength(1);
  });

  it('skips per-job failures instead of failing the batch', async () => {
    const { useCase } = stubComputeMatch({ j1: 85 });
    const batch = new ComputeMatchBatchUseCase(useCase, fitState('responded'), logger);
    const result = await batch.execute(input(['gone', 'j1']));
    expect(result.scores).toEqual([{ jobId: 'j1', overallScore: 85, rank: 'A' }]);
  });

  it('short-circuits to an empty list without a responded fit profile', async () => {
    const { useCase, calls } = stubComputeMatch({ j1: 85 });
    const batch = new ComputeMatchBatchUseCase(useCase, fitState('never'), logger);
    const result = await batch.execute(input(['j1']));
    expect(result.scores).toEqual([]);
    expect(calls).toEqual([]);
  });
});
