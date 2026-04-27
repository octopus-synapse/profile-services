import { stubLogger } from '@/shared-kernel/logger/testing';
import { describe, expect, it } from 'bun:test';
import { InMemoryJobsRepository } from '../../../testing';
import { JobEnrichmentService } from '../../services/job-enrichment.service';
import { ListJobsUseCase } from './list-jobs.use-case';

function makeUseCase() {
  const repo = new InMemoryJobsRepository();
  const enrichment = new JobEnrichmentService(repo);
  const useCase = new ListJobsUseCase(repo, enrichment, stubLogger);
  return { repo, useCase };
}

describe('ListJobsUseCase', () => {
  it('returns active jobs decorated with viewer flags', async () => {
    const { repo, useCase } = makeUseCase();
    repo.seedUser({ id: 'recruiter' });
    repo.seedUser({ id: 'viewer' });
    const job = repo.seedJob({
      authorId: 'recruiter',
      title: 'Backend',
      skills: ['typescript'],
    });
    repo.seedBookmark(job.id, 'viewer');

    const out = await useCase.execute({}, 'viewer');
    expect(out.total).toBe(1);
    expect(out.items[0].isBookmarked).toBe(true);
    expect(out.items[0].hasApplied).toBe(false);
  });

  it('omits inactive jobs', async () => {
    const { repo, useCase } = makeUseCase();
    repo.seedJob({ authorId: 'r', title: 'a', isActive: false });
    const out = await useCase.execute({}, undefined);
    expect(out.total).toBe(0);
  });

  it('filters by minEnglishLevel as a max-accepted ceiling', async () => {
    const { repo, useCase } = makeUseCase();
    repo.seedJob({ authorId: 'r', title: 'basic', minEnglishLevel: 'BASIC' });
    repo.seedJob({ authorId: 'r', title: 'fluent', minEnglishLevel: 'FLUENT' });
    repo.seedJob({ authorId: 'r', title: 'none', minEnglishLevel: null });

    const out = await useCase.execute({ minEnglishLevel: 'INTERMEDIATE' }, undefined);
    const titles = out.items.map((i) => i.title).sort();
    expect(titles).toEqual(['basic', 'none']);
  });
});
