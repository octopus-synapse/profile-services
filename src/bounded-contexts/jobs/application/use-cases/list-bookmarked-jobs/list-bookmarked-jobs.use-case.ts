/**
 * List jobs bookmarked by the caller. Returned in the legacy
 * `{ data, total, page, limit, totalPages }` shape — each item is the
 * full job + author with `bookmarkedAt` denormalised on top.
 */

import { JobsRepositoryPort } from '../../../domain/ports/jobs.repository.port';

export interface ListBookmarkedJobsResult {
  readonly data: Array<Record<string, unknown>>;
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
}

export class ListBookmarkedJobsUseCase {
  constructor(private readonly repository: JobsRepositoryPort) {}

  async execute(userId: string, page = 1, limit = 20): Promise<ListBookmarkedJobsResult> {
    const safeLimit = Math.min(limit, 100);
    const safePage = Math.max(1, page);
    const { items, total } = await this.repository.listBookmarkedJobs(userId, safePage, safeLimit);

    return {
      data: items.map((b) => ({ ...b.job, bookmarkedAt: b.createdAt })),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }
}
