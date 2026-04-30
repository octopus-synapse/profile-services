/**
 * Same listing as `ListJobsUseCase` but every row is enriched with a
 * 0-100 structured fit score for the viewer. Composes the listing
 * use case with the batch fit-score service so the controller stays a
 * one-liner.
 */

import { LoggerPort } from '@/shared-kernel';
import type { JobFilters } from '../../../domain/entities/job';
import type { FitScore } from '../../services/compute-fit-score.service';
import type { FitScoreBatchService } from '../../services/fit-score-batch.service';
import { ListJobsUseCase } from '../list-jobs/list-jobs.use-case';

export class ListJobsWithFitScoreUseCase {
  constructor(
    private readonly listJobs: ListJobsUseCase,
    private readonly fitScoreBatch: FitScoreBatchService,
    private readonly logger: LoggerPort,
  ) {}

  async execute(filters: JobFilters, userId: string): Promise<unknown> {
    const listing = await this.listJobs.execute(filters, userId);

    const scored = await this.fitScoreBatch.scoreJobsForUser(
      userId,
      listing.items.map((job) => ({
        id: job.id,
        skills: job.skills ?? [],
        minEnglishLevel: job.minEnglishLevel ?? null,
        remotePolicy: job.remotePolicy ?? null,
      })),
    );

    const enrichedItems = listing.items.map((job) => ({
      ...job,
      fitScore: scored.get(job.id) ?? (null as FitScore | null),
    }));

    return { ...listing, items: enrichedItems };
  }
}
