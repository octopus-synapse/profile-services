/**
 * Delete a job posting. Only the author can delete their own job —
 * everyone else gets `CannotModifyOthersJobException`.
 */

import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import type { Job } from '../../../domain/entities/job';
import { CannotModifyOthersJobException } from '../../../domain/exceptions/jobs.exceptions';
import { JobsRepositoryPort } from '../../../domain/ports/jobs.repository.port';

export class DeleteJobUseCase {
  constructor(private readonly repository: JobsRepositoryPort) {}

  async execute(id: string, userId: string): Promise<Job> {
    const job = await this.repository.findJobById(id);
    if (!job) throw new EntityNotFoundException('Job', id);
    if (job.authorId !== userId) {
      throw new CannotModifyOthersJobException('delete');
    }
    return this.repository.deleteJob(id);
  }
}
