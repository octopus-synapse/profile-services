/**
 * Active (non-withdrawn) applications submitted by the caller, paged.
 * Each row carries the job + author payload the UI renders inline.
 */

import { JobsRepositoryPort } from '../../../domain/ports/jobs.repository.port';

export interface ListMyApplicationsResult {
  readonly data: unknown[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
}

export class ListMyApplicationsUseCase {
  constructor(private readonly repository: JobsRepositoryPort) {}

  async execute(userId: string, page = 1, limit = 20): Promise<ListMyApplicationsResult> {
    const safeLimit = Math.min(limit, 100);
    const safePage = Math.max(1, page);
    const { items, total } = await this.repository.listMyApplications(
      userId,
      safePage,
      safeLimit,
    );
    return {
      data: items,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }
}
