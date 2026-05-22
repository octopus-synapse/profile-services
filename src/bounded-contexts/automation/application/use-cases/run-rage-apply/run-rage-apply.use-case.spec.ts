import { describe, expect, it } from 'bun:test';
import type { ResumeTailorService } from '@/bounded-contexts/resumes/resume-versions/application/services/resume-tailor.service';
import type { CacheLock, CachePort } from '@/shared-kernel/cache/cache.port';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { stubLogger } from '@/shared-kernel/logger/testing';
import {
  AutoApplyAlreadyRunningException,
  RageApplyLimitReachedException,
  RageApplyMinFitInvalidException,
} from '../../../domain/exceptions/automation.exceptions';
import { InMemoryRageApplyRepository } from '../../../testing/in-memory-rage-apply.repository';
import { CuratedSelectorService } from '../../services/curated-selector.service';
import { RunRageApplyUseCase } from './run-rage-apply.use-case';

function buildCache(initial?: { dailyCount?: number; lockTaken?: boolean }): CachePort {
  let count = initial?.dailyCount ?? 0;
  let lockTaken = initial?.lockTaken ?? false;
  return {
    isEnabled: true,
    async get<T>(_key: string): Promise<T | null> {
      return count as unknown as T;
    },
    async getSecure<T>(_key: string): Promise<T | null> {
      return null as T | null;
    },
    async set<T>(_key: string, value: T): Promise<void> {
      count = value as unknown as number;
    },
    async setSecure<T>(_key: string, value: T): Promise<void> {
      count = value as unknown as number;
    },
    async delete(): Promise<void> {},
    async deletePattern(): Promise<void> {},
    async flush(): Promise<void> {},
    async acquireLock(): Promise<CacheLock | null> {
      if (lockTaken) return null;
      lockTaken = true;
      return { release: async () => undefined };
    },
    async getOrSet<T>(_key: string, fn: () => Promise<T>): Promise<T> {
      return fn();
    },
    async incrWithTtl(_key: string, _ttl: number): Promise<number> {
      count += 1;
      return count;
    },
  } as CachePort;
}

type Pick = { jobId: string; matchScore: number };

function buildSelector(picks: Pick[]): CuratedSelectorService {
  return {
    selectForUser: async () => picks,
  } as unknown as CuratedSelectorService;
}

function buildTailor(
  impl: (input: { jobId?: string }) =>
    | {
        versionId: string;
        summary: string | null;
      }
    | Error,
): ResumeTailorService {
  return {
    tailorForJob: async (input: { jobId?: string }) => {
      const result = impl(input);
      if (result instanceof Error) throw result;
      return {
        versionId: result.versionId,
        versionNumber: 1,
        label: 'tailored',
        summary: result.summary,
        jobTitle: null,
        bullets: [],
      };
    },
  } as unknown as ResumeTailorService;
}

describe('RunRageApplyUseCase', () => {
  it('rejects an inactive user', async () => {
    const repo = new InMemoryRageApplyRepository();
    repo.seedUser('u-1', { isActive: false, primaryResumeId: 'r-1', applyCriteria: null });
    const useCase = new RunRageApplyUseCase(
      repo,
      buildSelector([]),
      buildTailor(() => ({ versionId: 'v-1', summary: null })),
      stubLogger,
    );
    await expect(useCase.execute({ userId: 'u-1' })).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
  });

  it('rejects when the user has no primary resume', async () => {
    const repo = new InMemoryRageApplyRepository();
    repo.seedUser('u-1', { isActive: true, primaryResumeId: null, applyCriteria: null });
    const useCase = new RunRageApplyUseCase(
      repo,
      buildSelector([]),
      buildTailor(() => ({ versionId: 'v-1', summary: null })),
      stubLogger,
    );
    await expect(useCase.execute({ userId: 'u-1' })).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
  });

  it('returns a clean zero-result when the selector produces no picks', async () => {
    const repo = new InMemoryRageApplyRepository();
    repo.seedUser('u-1', { isActive: true, primaryResumeId: 'r-1', applyCriteria: null });
    const useCase = new RunRageApplyUseCase(
      repo,
      buildSelector([]),
      buildTailor(() => ({ versionId: 'v-1', summary: null })),
      stubLogger,
    );
    const result = await useCase.execute({ userId: 'u-1' });
    expect(result).toEqual({ attempted: 0, submitted: 0, skippedExisting: 0, failed: [] });
  });

  it('submits applications for each pick and uses tailored summary as cover letter', async () => {
    const repo = new InMemoryRageApplyRepository();
    repo.seedUser('u-1', { isActive: true, primaryResumeId: 'r-1', applyCriteria: null });
    const useCase = new RunRageApplyUseCase(
      repo,
      buildSelector([
        { jobId: 'j-1', matchScore: 90 },
        { jobId: 'j-2', matchScore: 88 },
      ]),
      buildTailor(({ jobId }) => ({ versionId: `v-${jobId}`, summary: `cover for ${jobId}` })),
      stubLogger,
    );
    const result = await useCase.execute({ userId: 'u-1' });

    expect(result.attempted).toBe(2);
    expect(result.submitted).toBe(2);
    expect(result.skippedExisting).toBe(0);
    expect(result.failed).toEqual([]);
    expect(repo.applications).toHaveLength(2);
    expect(repo.applications[0]).toMatchObject({
      jobId: 'j-1',
      userId: 'u-1',
      resumeId: 'r-1',
      tailoredVersionId: 'v-j-1',
      coverLetter: 'cover for j-1',
    });
  });

  it('skips picks the user already applied to', async () => {
    const repo = new InMemoryRageApplyRepository();
    repo.seedUser('u-1', { isActive: true, primaryResumeId: 'r-1', applyCriteria: null });
    repo.seedExistingApplication('j-1', 'u-1');
    const useCase = new RunRageApplyUseCase(
      repo,
      buildSelector([
        { jobId: 'j-1', matchScore: 95 },
        { jobId: 'j-2', matchScore: 90 },
      ]),
      buildTailor(() => ({ versionId: 'v-x', summary: null })),
      stubLogger,
    );
    const result = await useCase.execute({ userId: 'u-1' });
    expect(result.skippedExisting).toBe(1);
    expect(result.submitted).toBe(1);
  });

  it('captures per-job tailoring failures without aborting the run', async () => {
    const repo = new InMemoryRageApplyRepository();
    repo.seedUser('u-1', { isActive: true, primaryResumeId: 'r-1', applyCriteria: null });
    const useCase = new RunRageApplyUseCase(
      repo,
      buildSelector([
        { jobId: 'j-good', matchScore: 92 },
        { jobId: 'j-bad', matchScore: 91 },
      ]),
      buildTailor(({ jobId }) =>
        jobId === 'j-bad' ? new Error('tailor timeout') : { versionId: 'v-good', summary: null },
      ),
      stubLogger,
    );
    const result = await useCase.execute({ userId: 'u-1' });

    expect(result.submitted).toBe(1);
    expect(result.failed).toEqual([{ jobId: 'j-bad', reason: 'tailor timeout' }]);
  });

  it('rejects an out-of-range minFit', async () => {
    const repo = new InMemoryRageApplyRepository();
    repo.seedUser('u-1', { isActive: true, primaryResumeId: 'r-1', applyCriteria: null });
    const useCase = new RunRageApplyUseCase(
      repo,
      buildSelector([]),
      buildTailor(() => ({ versionId: 'v-1', summary: null })),
      stubLogger,
    );
    await expect(useCase.execute({ userId: 'u-1', minFit: 150 })).rejects.toBeInstanceOf(
      RageApplyMinFitInvalidException,
    );
  });

  it('rejects when the cache lock is already held (concurrent run)', async () => {
    const repo = new InMemoryRageApplyRepository();
    repo.seedUser('u-1', { isActive: true, primaryResumeId: 'r-1', applyCriteria: null });
    const useCase = new RunRageApplyUseCase(
      repo,
      buildSelector([]),
      buildTailor(() => ({ versionId: 'v-1', summary: null })),
      stubLogger,
      buildCache({ lockTaken: true }),
    );
    await expect(useCase.execute({ userId: 'u-1' })).rejects.toBeInstanceOf(
      AutoApplyAlreadyRunningException,
    );
  });

  it('rejects when the daily limit has already been reached', async () => {
    const repo = new InMemoryRageApplyRepository();
    repo.seedUser('u-1', { isActive: true, primaryResumeId: 'r-1', applyCriteria: null });
    const useCase = new RunRageApplyUseCase(
      repo,
      buildSelector([]),
      buildTailor(() => ({ versionId: 'v-1', summary: null })),
      stubLogger,
      buildCache({ dailyCount: 99 }),
    );
    await expect(useCase.execute({ userId: 'u-1' })).rejects.toBeInstanceOf(
      RageApplyLimitReachedException,
    );
  });

  it('falls back to defaultCover when tailor returns no summary', async () => {
    const repo = new InMemoryRageApplyRepository();
    repo.seedUser('u-1', {
      isActive: true,
      primaryResumeId: 'r-1',
      applyCriteria: {
        minFit: null,
        stacks: [],
        seniorities: [],
        remotePolicies: [],
        paymentCurrencies: [],
        minSalaryUsd: null,
        defaultCover: 'fallback cover',
      },
    });
    const useCase = new RunRageApplyUseCase(
      repo,
      buildSelector([{ jobId: 'j-1', matchScore: 88 }]),
      buildTailor(() => ({ versionId: 'v-1', summary: null })),
      stubLogger,
    );
    await useCase.execute({ userId: 'u-1' });
    expect(repo.applications[0]?.coverLetter).toBe('fallback cover');
  });
});
