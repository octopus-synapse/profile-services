import { describe, expect, it } from 'bun:test';
import type { ResumeAnalyticsFacade } from '@/bounded-contexts/analytics/resume-analytics/services/resume-analytics.facade';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { CuratedSelectorAllScoringFailedException } from '../../domain/exceptions/automation.exceptions';
import { CuratedSelectorService } from './curated-selector.service';

type JobRow = {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  skills: string[];
};

interface FakeUserRow {
  primaryResumeId: string | null;
  preferences: { applyCriteria: unknown } | null;
}

function buildPrismaMock(opts: {
  user: FakeUserRow | null;
  jobs: JobRow[];
}): PrismaService {
  return {
    user: {
      findUnique: async () => opts.user,
    },
    job: {
      findMany: async () => opts.jobs,
    },
  } as unknown as PrismaService;
}

function buildAnalyticsMock(
  scoreFor: (jobText: string) => number | Promise<number> | Error,
): ResumeAnalyticsFacade {
  return {
    matchJobDescription: async (_resumeId: string, _userId: string, jobText: string) => {
      const result = await scoreFor(jobText);
      if (result instanceof Error) throw result;
      return { matchScore: result };
    },
  } as unknown as ResumeAnalyticsFacade;
}

describe('CuratedSelectorService', () => {
  it('returns an empty list when the user has no primary resume', async () => {
    const prisma = buildPrismaMock({
      user: { primaryResumeId: null, preferences: null },
      jobs: [],
    });
    const analytics = buildAnalyticsMock(() => 0);
    const service = new CuratedSelectorService(prisma, analytics, stubLogger);

    const picks = await service.selectForUser({
      userId: 'u-1',
      since: new Date('2024-01-01'),
    });
    expect(picks).toEqual([]);
  });

  it('keeps only jobs whose matchScore meets the minFit floor and ranks descending', async () => {
    const prisma = buildPrismaMock({
      user: { primaryResumeId: 'r-1', preferences: null },
      jobs: [
        { id: 'j-low', title: 'low', description: 'd', requirements: [], skills: [] },
        { id: 'j-mid', title: 'mid', description: 'd', requirements: [], skills: [] },
        { id: 'j-hi', title: 'hi', description: 'd', requirements: [], skills: [] },
      ],
    });
    const analytics = buildAnalyticsMock((text) => {
      if (text.startsWith('low')) return 50;
      if (text.startsWith('mid')) return 82;
      return 95;
    });
    const service = new CuratedSelectorService(prisma, analytics, stubLogger);

    const picks = await service.selectForUser({
      userId: 'u-1',
      since: new Date('2024-01-01'),
      minFit: 80,
    });

    expect(picks.map((p) => p.jobId)).toEqual(['j-hi', 'j-mid']);
  });

  it('respects the limit parameter', async () => {
    const prisma = buildPrismaMock({
      user: { primaryResumeId: 'r-1', preferences: null },
      jobs: [
        { id: 'a', title: 'a', description: 'd', requirements: [], skills: [] },
        { id: 'b', title: 'b', description: 'd', requirements: [], skills: [] },
        { id: 'c', title: 'c', description: 'd', requirements: [], skills: [] },
      ],
    });
    const analytics = buildAnalyticsMock(() => 90);
    const service = new CuratedSelectorService(prisma, analytics, stubLogger);

    const picks = await service.selectForUser({
      userId: 'u-1',
      since: new Date('2024-01-01'),
      limit: 2,
    });
    expect(picks).toHaveLength(2);
  });

  it('raises CuratedSelectorAllScoringFailed when every scoring call throws', async () => {
    const prisma = buildPrismaMock({
      user: { primaryResumeId: 'r-1', preferences: null },
      jobs: [
        { id: 'a', title: 'a', description: 'd', requirements: [], skills: [] },
        { id: 'b', title: 'b', description: 'd', requirements: [], skills: [] },
      ],
    });
    const analytics = buildAnalyticsMock(() => new Error('downstream down'));
    const service = new CuratedSelectorService(prisma, analytics, stubLogger);

    await expect(
      service.selectForUser({ userId: 'u-1', since: new Date('2024-01-01') }),
    ).rejects.toBeInstanceOf(CuratedSelectorAllScoringFailedException);
  });

  it('returns an empty list when no candidates exist', async () => {
    const prisma = buildPrismaMock({
      user: { primaryResumeId: 'r-1', preferences: null },
      jobs: [],
    });
    const analytics = buildAnalyticsMock(() => 99);
    const service = new CuratedSelectorService(prisma, analytics, stubLogger);

    const picks = await service.selectForUser({ userId: 'u-1', since: new Date('2024-01-01') });
    expect(picks).toEqual([]);
  });
});
