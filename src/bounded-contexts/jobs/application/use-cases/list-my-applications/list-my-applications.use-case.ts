/**
 * Active (non-withdrawn) applications submitted by the caller, paged.
 * Each row carries the job + author payload the UI renders inline.
 */

import type { PaginatedResponse } from '@/shared-kernel/schemas/common/api.types';
import { buildPaginatedResponse } from '@/shared-kernel/schemas/common/build-paginated-response';
import { JobsRepositoryPort } from '../../../domain/ports/jobs.repository.port';

export type ListMyApplicationsResult = PaginatedResponse<unknown>;

export class ListMyApplicationsUseCase {
  constructor(private readonly repository: JobsRepositoryPort) {}

  async execute(userId: string, page = 1, limit = 20): Promise<ListMyApplicationsResult> {
    const safeLimit = Math.min(limit, 100);
    const safePage = Math.max(1, page);
    const pagination = { page: safePage, limit: safeLimit };
    const { items, total } = await this.repository.listMyApplications(userId, safePage, safeLimit);
    return buildPaginatedResponse<unknown>(items, total, pagination);
  }
}
