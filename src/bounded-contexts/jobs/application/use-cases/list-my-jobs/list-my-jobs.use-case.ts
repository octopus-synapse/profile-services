/**
 * Recruiter-side: paginated list of jobs the caller authored.
 */

import type { PaginatedResult } from '@/shared-kernel/database';
import type { Job } from '../../../domain/entities/job.entity';
import { JobsRepositoryPort } from '../../../domain/ports/jobs.repository.port';

export class ListMyJobsUseCase {
  constructor(private readonly repository: JobsRepositoryPort) {}

  execute(userId: string, page = 1, limit = 20): Promise<PaginatedResult<Job>> {
    return this.repository.listJobsByAuthor(userId, page, limit);
  }
}
