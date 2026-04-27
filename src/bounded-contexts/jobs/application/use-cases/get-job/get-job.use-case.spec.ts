import { stubLogger } from '@/shared-kernel/logger/testing';
import { describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { InMemoryJobsRepository } from '../../../testing';
import { JobEnrichmentService } from '../../services/job-enrichment.service';
import { GetJobUseCase } from './get-job.use-case';

describe('GetJobUseCase', () => {
  it('throws when the job is missing', async () => {
    const repo = new InMemoryJobsRepository();
    await expect(
      new GetJobUseCase(repo, new JobEnrichmentService(repo), stubLogger).execute('x', undefined),
    ).rejects.toBeInstanceOf(EntityNotFoundException);
  });

  it('decorates the job with viewer flags', async () => {
    const repo = new InMemoryJobsRepository();
    repo.seedUser({ id: 'r', name: 'R' });
    const job = repo.seedJob({ authorId: 'r', title: 'A' });
    repo.seedBookmark(job.id, 'me');
    const out = (await new GetJobUseCase(repo, new JobEnrichmentService(repo), stubLogger).execute(
      job.id,
      'me',
    )) as { isBookmarked: boolean; hasApplied: boolean };
    expect(out.isBookmarked).toBe(true);
    expect(out.hasApplied).toBe(false);
  });
});
