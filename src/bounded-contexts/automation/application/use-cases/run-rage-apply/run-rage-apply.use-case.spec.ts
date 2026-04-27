import { describe, expect, it } from 'bun:test';
import type { ResumeTailorService } from '@/bounded-contexts/resumes/resume-versions/services/resume-tailor/resume-tailor.service';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { InMemoryRageApplyRepository } from '../../../testing/in-memory-rage-apply.repository';
import { CuratedSelectorService } from '../../services/curated-selector.service';
import { RunRageApplyUseCase } from './run-rage-apply.use-case';

type Pick = { jobId: string; matchScore: number };

function buildSelector(picks: Pick[]): CuratedSelectorService {
  return {
    selectForUser: async () => picks,
  } as unknown as CuratedSelectorService;
}

function buildTailor(
  impl: (input: { jobId?: string }) => {
    versionId: string;
    summary: string | null;
  } | Error,
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
        jobId === 'j-bad'
          ? new Error('tailor timeout')
          : { versionId: 'v-good', summary: null },
      ),
      stubLogger,
    );
    const result = await useCase.execute({ userId: 'u-1' });

    expect(result.submitted).toBe(1);
    expect(result.failed).toEqual([{ jobId: 'j-bad', reason: 'tailor timeout' }]);
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
