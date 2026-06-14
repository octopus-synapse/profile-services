/**
 * Paginated read over the caller's saved external jobs, newest first.
 * Rows are snapshots — they render the same card shape as the live
 * list even after the source listing has been swept.
 */

import type { PaginatedResponse } from '@/shared-kernel/schemas/common/api.types';
import { buildPaginatedResponse } from '@/shared-kernel/schemas/common/build-paginated-response';
import type {
  SavedExternalJobRecord,
  SavedExternalJobsRepositoryPort,
} from '../../../domain/ports/saved-external-jobs.repository.port';

export type ListSavedExternalJobsResult = PaginatedResponse<SavedExternalJobRecord>;

export class ListSavedExternalJobsUseCase {
  constructor(private readonly saved: SavedExternalJobsRepositoryPort) {}

  async execute(userId: string, page = 1, limit = 20): Promise<ListSavedExternalJobsResult> {
    const safeLimit = Math.min(limit, 100);
    const safePage = Math.max(1, page);
    const { items, total } = await this.saved.listByUser(userId, safePage, safeLimit);
    return buildPaginatedResponse(items, total, { page: safePage, limit: safeLimit });
  }
}
