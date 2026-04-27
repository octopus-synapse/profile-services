import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryJobsRepository } from '../../../testing';
import { FitScoreBatchService } from '../../services/fit-score-batch.service';
import { JobEnrichmentService } from '../../services/job-enrichment.service';
import { ListJobsUseCase } from '../list-jobs/list-jobs.use-case';
import { ListJobsWithFitScoreUseCase } from './list-jobs-with-fit-score.use-case';

describe('ListJobsWithFitScoreUseCase', () => {
  it('attaches a fit score to every listed item', async () => {
    const repo = new InMemoryJobsRepository();
    repo.seedUser({ id: 'me', skills: ['typescript', 'postgres'] });
    repo.seedJob({ authorId: 'r', title: 'A', skills: ['typescript', 'postgres', 'docker'] });
    repo.seedJob({ authorId: 'r', title: 'B', skills: ['rust'] });

    const enrichment = new JobEnrichmentService(repo);
    const listJobs = new ListJobsUseCase(repo, enrichment, stubLogger);
    const fitBatch = new FitScoreBatchService(repo);
    const useCase = new ListJobsWithFitScoreUseCase(listJobs, fitBatch, stubLogger);

    const out = (await useCase.execute({}, 'me')) as {
      items: Array<{ title: string; fitScore: { score: number } | null }>;
    };
    const byTitle = new Map(out.items.map((i) => [i.title, i.fitScore]));
    expect(byTitle.get('A')!.score).toBeGreaterThan(byTitle.get('B')!.score);
  });
});
