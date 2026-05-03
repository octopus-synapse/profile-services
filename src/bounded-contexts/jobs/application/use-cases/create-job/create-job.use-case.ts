/**
 * Persist a new job posting authored by the caller.
 */

import type { CreateJobInput, Job } from '../../../domain/entities/job.entity';
import { JobsRepositoryPort } from '../../../domain/ports/jobs.repository.port';

export class CreateJobUseCase {
  constructor(private readonly repository: JobsRepositoryPort) {}

  execute(authorId: string, dto: CreateJobInput): Promise<Job> {
    return this.repository.createJob(authorId, dto);
  }
}
