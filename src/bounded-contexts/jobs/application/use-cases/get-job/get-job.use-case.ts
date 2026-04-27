/**
 * Fetch a single job by id, decorated with viewer-relative flags.
 */

import { LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { JobsRepositoryPort } from '../../../domain/ports/jobs.repository.port';
import type { JobEnrichmentService } from '../../services/job-enrichment.service';

export class GetJobUseCase {
  constructor(
    private readonly repository: JobsRepositoryPort,
    private readonly enrichment: JobEnrichmentService,
    private readonly logger: LoggerPort,
  ) {}

  async execute(id: string, viewerId: string | undefined): Promise<unknown> {
    const job = await this.repository.findJobByIdWithAuthor(id);
    if (!job) throw new EntityNotFoundException('Job', id);

    const [enriched] = await this.enrichment.withBookmarkedAndApplied([job], viewerId);
    return enriched;
  }
}
