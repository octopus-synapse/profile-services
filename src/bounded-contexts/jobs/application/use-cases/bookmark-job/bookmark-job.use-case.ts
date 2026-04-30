/**
 * Idempotent bookmark. Re-bookmarking returns
 * `{ alreadyBookmarked: true }` so the UI can branch without raising.
 */

import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { JobsRepositoryPort } from '../../../domain/ports/jobs.repository.port';

export interface BookmarkJobResult {
  readonly jobId: string;
  readonly userId: string;
  readonly alreadyBookmarked: boolean;
}

export class BookmarkJobUseCase {
  constructor(private readonly repository: JobsRepositoryPort) {}

  async execute(jobId: string, userId: string): Promise<BookmarkJobResult> {
    const job = await this.repository.findJobById(jobId);
    if (!job) throw new EntityNotFoundException('Job', jobId);

    const existing = await this.repository.findBookmark(jobId, userId);
    if (existing) {
      return { jobId, userId, alreadyBookmarked: true };
    }
    await this.repository.createBookmark(jobId, userId);
    return { jobId, userId, alreadyBookmarked: false };
  }
}
