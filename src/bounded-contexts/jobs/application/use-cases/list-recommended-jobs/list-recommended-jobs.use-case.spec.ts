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
    expect(out.data.map((d) => d.title)).toEqual(['A', 'B']);
    expect(out.data[0].matchScore).toBeGreaterThan(out.data[1].matchScore);
  });
});
