/**
 * Paginated read over the locally ingested `ExternalJobListing` rows
 * (JSearch daily batch). Never touches the upstream API — the worker is
 * the only writer, so this route stays quota-free.
 */

import type { PaginatedResponse } from '@/shared-kernel/schemas/common/api.types';
import { buildPaginatedResponse } from '@/shared-kernel/schemas/common/build-paginated-response';
import type {
  ExternalJobListFilters,
  ExternalJobListingRecord,
  ExternalJobListingsRepositoryPort,
} from '../../../domain/ports/external-job-listings.repository.port';

export type ListExternalJobsResult = PaginatedResponse<ExternalJobListingRecord>;

export class ListExternalJobsUseCase {
  constructor(private readonly repository: ExternalJobListingsRepositoryPort) {}

  async execute(
    filters: ExternalJobListFilters,
    page = 1,
    limit = 20,
  ): Promise<ListExternalJobsResult> {
    const safeLimit = Math.min(limit, 100);
    const safePage = Math.max(1, page);
    const { items, total } = await this.repository.listListings(filters, safePage, safeLimit);
    return buildPaginatedResponse(items, total, { page: safePage, limit: safeLimit });
  }
}
