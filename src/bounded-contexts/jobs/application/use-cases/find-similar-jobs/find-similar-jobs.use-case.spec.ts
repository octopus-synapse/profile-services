import { stubLogger } from '@/shared-kernel/logger/testing';
import { describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { InMemoryJobsRepository } from '../../../testing';
import { JobEnrichmentService } from '../../services/job-enrichment.service';
import { FindSimilarJobsUseCase } from './find-similar-jobs.use-case';

describe('FindSimilarJobsUseCase', () => {
  it('throws when the source job is missing', async () => {
    const repo = new InMemoryJobsRepository();
    await expect(
      new FindSimilarJobsUseCase(repo, new JobEnrichmentService(repo), stubLogger).execute(
        'missing',
        undefined,
      ),
    ).rejects.toBeInstanceOf(EntityNotFoundException);
  });

  it('returns ranked candidates by skill overlap', async () => {
    const repo = new InMemoryJobsRepository();
    const source = repo.seedJob({ authorId: 'r', title: 'src', skills: ['ts', 'pg'] });
    repo.seedJob({ authorId: 'r', title: 'A', skills: ['ts', 'pg'] });
    repo.seedJob({ authorId: 'r', title: 'B', skills: ['ts'] });
    repo.seedJob({ authorId: 'r', title: 'unrelated', skills: ['rust'] });

    const out = await new FindSimilarJobsUseCase(repo, new JobEnrichmentService(repo), stubLogger).execute(
      source.id,
      undefined,
    );
    expect(out.items.map((i) => (i as unknown as { title: string }).title)).toEqual(['A', 'B']);
  });
});
