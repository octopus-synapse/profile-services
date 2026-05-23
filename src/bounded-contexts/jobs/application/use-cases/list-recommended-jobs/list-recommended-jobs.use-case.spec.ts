import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryJobsRepository } from '../../../testing';
import { JobEnrichmentService } from '../../services/job-enrichment.service';
import { ListRecommendedJobsUseCase } from './list-recommended-jobs.use-case';

describe('ListRecommendedJobsUseCase', () => {
  it('returns empty when the user has no skills', async () => {
    const repo = new InMemoryJobsRepository();
    repo.seedUser({ id: 'me' });
    repo.seedJob({ authorId: 'r', title: 'A', skills: ['typescript'] });
    const out = await new ListRecommendedJobsUseCase(
      repo,
      new JobEnrichmentService(repo),
      stubLogger,
    ).execute('me');
    expect(out.total).toBe(0);
  });

  it('orders candidates by skill-overlap percentage', async () => {
    const repo = new InMemoryJobsRepository();
    repo.seedUser({ id: 'me', skills: ['typescript', 'postgres'] });
    repo.seedJob({ authorId: 'r', title: 'A', skills: ['typescript', 'postgres'] });
    repo.seedJob({ authorId: 'r', title: 'B', skills: ['typescript', 'rust', 'go'] });
    repo.seedJob({ authorId: 'me', title: 'self', skills: ['typescript'] }); // own job → excluded

    const out = await new ListRecommendedJobsUseCase(
      repo,
      new JobEnrichmentService(repo),
      stubLogger,
    ).execute('me');
    expect(out.items.map((d) => d.title)).toEqual(['A', 'B']);
    expect(out.items[0].matchScore).toBeGreaterThan(out.items[1].matchScore);
  });

  // P1 #36 — symmetric Jaccard matchScore. A 1-skill job overlapping 1 of
  // the user's 50 skills should NOT score 100%.
  it('uses symmetric Jaccard so a narrow job does not score 100% (P1 #36)', async () => {
    const repo = new InMemoryJobsRepository();
    repo.seedUser({
      id: 'me',
      skills: ['typescript', 'postgres', 'rust', 'go', 'python', 'aws'],
    });
    repo.seedJob({ authorId: 'r', title: 'narrow', skills: ['typescript'] });

    const out = await new ListRecommendedJobsUseCase(
      repo,
      new JobEnrichmentService(repo),
      stubLogger,
    ).execute('me');
    expect(out.items.length).toBe(1);
    // 1 / 6 = ~17
    expect(out.items[0].matchScore).toBeLessThan(50);
  });

  it('clamps limit to [1, 50] (P1 #36)', async () => {
    const repo = new InMemoryJobsRepository();
    repo.seedUser({ id: 'me', skills: ['typescript'] });
    repo.seedJob({ authorId: 'r', title: 'A', skills: ['typescript'] });

    const useCase = new ListRecommendedJobsUseCase(
      repo,
      new JobEnrichmentService(repo),
      stubLogger,
    );

    const zero = await useCase.execute('me', 1, 0);
    expect(zero.limit).toBe(1);

    const huge = await useCase.execute('me', 1, 999);
    expect(huge.limit).toBe(50);
  });
});
