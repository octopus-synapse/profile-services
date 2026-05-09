/**
 * List jobs bookmarked by the caller. Each item is the full job +
 * author with `bookmarkedAt` denormalised on top.
 */

import type { PaginatedResponse } from '@/shared-kernel/schemas/common/api.types';
import { buildPaginatedResponse } from '@/shared-kernel/schemas/common/build-paginated-response';
import { JobsRepositoryPort } from '../../../domain/ports/jobs.repository.port';

export type ListBookmarkedJobsResult = PaginatedResponse<Record<string, unknown>>;

export class ListBookmarkedJobsUseCase {
  constructor(private readonly repository: JobsRepositoryPort) {}

  async execute(userId: string, page = 1, limit = 20): Promise<ListBookmarkedJobsResult> {
    const safeLimit = Math.min(limit, 100);
    const safePage = Math.max(1, page);
    const pagination = { page: safePage, limit: safeLimit };
    const { items, total } = await this.repository.listBookmarkedJobs(userId, safePage, safeLimit);

    const enriched = items.map((b) => ({ ...b.job, bookmarkedAt: b.createdAt }));
    return buildPaginatedResponse(enriched, total, pagination);
  }
}
