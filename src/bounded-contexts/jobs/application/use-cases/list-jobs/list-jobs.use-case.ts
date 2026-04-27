/**
 * Paginated public listing of active jobs with viewer-relative
 * decorations (`isBookmarked`, `hasApplied`).
 */

import { LoggerPort } from '@/shared-kernel';
import type { PaginatedResult } from '@/shared-kernel/database';
import type { Job, JobFilters } from '../../../domain/entities/job';
import { JobsRepositoryPort } from '../../../domain/ports/jobs.repository.port';
import type { JobEnrichmentService } from '../../services/job-enrichment.service';

export interface ListJobsResult extends PaginatedResult<Job & { isBookmarked: boolean; hasApplied: boolean }> {}

export class ListJobsUseCase {
  constructor(
    private readonly repository: JobsRepositoryPort,
    private readonly enrichment: JobEnrichmentService,
    private readonly logger: LoggerPort,
  ) {}

  async execute(filters: JobFilters, viewerId: string | undefined): Promise<ListJobsResult> {
    const result = await this.repository.listJobs(filters);
    const items = await this.enrichment.withBookmarkedAndApplied(result.items, viewerId);
    return { ...result, items };
  }
}
