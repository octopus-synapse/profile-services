import { describe, expect, it } from 'bun:test';
import type { ResumeAnalyticsFacade } from '@/bounded-contexts/analytics/resume-analytics/services/resume-analytics.facade';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { CuratedSelectorAllScoringFailedException } from '../../domain/exceptions/automation.exceptions';
import {
  CuratedSelectorJobQuery,
  CuratedSelectorJobView,
  CuratedSelectorRepositoryPort,
  CuratedSelectorUserView,
} from '../../domain/ports/curated-selector.repository.port';
import { CuratedSelectorService } from './curated-selector.service';

class InMemoryCuratedSelectorRepository extends CuratedSelectorRepositoryPort {
  constructor(
    private readonly user: CuratedSelectorUserView | null,
    private readonly jobs: CuratedSelectorJobView[],
  ) {
    super();
  }
  async findUserView(_userId: string): Promise<CuratedSelectorUserView | null> {
    return this.user;
  }
  async listCandidateJobs(_query: CuratedSelectorJobQuery): Promise<CuratedSelectorJobView[]> {
    return this.jobs;
  }
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

function jobView(id: string, title: string): CuratedSelectorJobView {
  return { id, title, description: 'd', requirements: [], skills: [] };
}

describe('CuratedSelectorService', () => {
  it('returns an empty list when the user has no primary resume', async () => {
    const repo = new InMemoryCuratedSelectorRepository(
      { primaryResumeId: null, applyCriteria: null },
      [],
    );
    const analytics = buildAnalyticsMock(() => 0);
    const service = new CuratedSelectorService(repo, analytics, stubLogger);

    const picks = await service.selectForUser({
      userId: 'u-1',
      since: new Date('2024-01-01'),
    });
    expect(picks).toEqual([]);
  });

  it('keeps only jobs whose matchScore meets the minFit floor and ranks descending', async () => {
    const repo = new InMemoryCuratedSelectorRepository(
      { primaryResumeId: 'r-1', applyCriteria: null },
      [jobView('j-low', 'low'), jobView('j-mid', 'mid'), jobView('j-hi', 'hi')],
    );
    const analytics = buildAnalyticsMock((text) => {
      if (text.startsWith('low')) return 50;
      if (text.startsWith('mid')) return 82;
      return 95;
    });
    const service = new CuratedSelectorService(repo, analytics, stubLogger);

    const picks = await service.selectForUser({
      userId: 'u-1',
      since: new Date('2024-01-01'),
      minFit: 80,
    });

    expect(picks.map((p) => p.jobId)).toEqual(['j-hi', 'j-mid']);
  });

  it('respects the limit parameter', async () => {
    const repo = new InMemoryCuratedSelectorRepository(
      { primaryResumeId: 'r-1', applyCriteria: null },
      [jobView('a', 'a'), jobView('b', 'b'), jobView('c', 'c')],
    );
    const analytics = buildAnalyticsMock(() => 90);
    const service = new CuratedSelectorService(repo, analytics, stubLogger);

    const picks = await service.selectForUser({
      userId: 'u-1',
      since: new Date('2024-01-01'),
      limit: 2,
    });
    expect(picks).toHaveLength(2);
  });

  it('raises CuratedSelectorAllScoringFailed when every scoring call throws', async () => {
    const repo = new InMemoryCuratedSelectorRepository(
      { primaryResumeId: 'r-1', applyCriteria: null },
      [jobView('a', 'a'), jobView('b', 'b')],
    );
    const analytics = buildAnalyticsMock(() => new Error('downstream down'));
    const service = new CuratedSelectorService(repo, analytics, stubLogger);

    await expect(
      service.selectForUser({ userId: 'u-1', since: new Date('2024-01-01') }),
    ).rejects.toBeInstanceOf(CuratedSelectorAllScoringFailedException);
  });

  it('returns an empty list when no candidates exist', async () => {
    const repo = new InMemoryCuratedSelectorRepository(
      { primaryResumeId: 'r-1', applyCriteria: null },
      [],
    );
    const analytics = buildAnalyticsMock(() => 99);
    const service = new CuratedSelectorService(repo, analytics, stubLogger);

    const picks = await service.selectForUser({ userId: 'u-1', since: new Date('2024-01-01') });
    expect(picks).toEqual([]);
  });
});
