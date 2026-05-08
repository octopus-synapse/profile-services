/**
 * Idempotent unbookmark. Always returns `{ removed: true }` even when
 * no row matched — callers don't need to branch on existence.
 */

import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { JobsRepositoryPort } from '../../../domain/ports/jobs.repository.port';

export interface UnbookmarkJobResult {
  readonly jobId: string;
  readonly userId: string;
  readonly removed: true;
}

export class UnbookmarkJobUseCase {
  constructor(private readonly repository: JobsRepositoryPort) {}

  async execute(jobId: string, userId: string): Promise<UnbookmarkJobResult> {
    const job = await this.repository.findJobById(jobId);
    if (!job) throw new EntityNotFoundException('Job', jobId);
    await this.repository.deleteBookmarks(jobId, userId);
    return { jobId, userId, removed: true };
  }
}
