/**
 * Recommended jobs = the precomputed top-N Match Score over EXTERNAL
 * (JSearch) listings, written by the job-match daily-recommendations
 * worker via the shared-kernel cache contract. This use-case only READS:
 * it hydrates the cached listing ids (in rank order) into full records and
 * annotates each with the caller's saved state + the match score.
 *
 * Empty until the worker has run for this user (cron-driven precompute),
 * or when no cached listing survives hydration (30-day retention sweep).
 */

import { LoggerPort } from '@/shared-kernel';
import { CachePort, type RecommendedMatch, recommendationsCacheKey } from '@/shared-kernel/cache';
import type { PaginatedResponse } from '@/shared-kernel/schemas/common/api.types';
import { buildPaginatedResponse } from '@/shared-kernel/schemas/common/build-paginated-response';
import {
  type ExternalJobListingRecord,
  ExternalJobListingsRepositoryPort,
} from '../../../domain/ports/external-job-listings.repository.port';
import { SavedExternalJobsRepositoryPort } from '../../../domain/ports/saved-external-jobs.repository.port';
import type { ExternalJobListItem } from '../list-external-jobs/list-external-jobs.use-case';

export type RecommendedExternalJobItem = ExternalJobListItem & { readonly matchScore: number };

export type ListRecommendedJobsResult = PaginatedResponse<RecommendedExternalJobItem>;

export class ListRecommendedJobsUseCase {
  constructor(
    private readonly cache: CachePort,
    private readonly listings: ExternalJobListingsRepositoryPort,
    private readonly saved: SavedExternalJobsRepositoryPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(userId: string, page = 1, limit = 20): Promise<ListRecommendedJobsResult> {
    const safeLimit = Math.max(1, Math.min(limit, 50));
    const safePage = Math.max(1, page);
    const pagination = { page: safePage, limit: safeLimit };

    const ranked = await this.cache.get<RecommendedMatch[]>(recommendationsCacheKey(userId));
    if (!ranked || ranked.length === 0) {
      return buildPaginatedResponse<RecommendedExternalJobItem>([], 0, pagination);
    }

    // Hydrate in rank order; drop ids whose listing was swept so a stale
    // cache entry degrades gracefully instead of erroring.
    const hydrated: Array<{ record: ExternalJobListingRecord; score: number }> = [];
    for (const entry of ranked) {
      const record = await this.listings.findListingById(entry.externalJobId);
      if (record) hydrated.push({ record, score: entry.score });
    }
    if (hydrated.length === 0) {
      this.logger.warn(
        `recommended: all ${ranked.length} cached listings missing for user=${userId}`,
        'ListRecommendedJobs',
      );
      return buildPaginatedResponse<RecommendedExternalJobItem>([], 0, pagination);
    }

    const savedByExternalId = await this.saved.listSavedExternalIds(
      userId,
      hydrated.map((h) => h.record.externalId),
    );

    const items: RecommendedExternalJobItem[] = hydrated.map((h) => ({
      ...h.record,
      savedId: savedByExternalId.get(h.record.externalId) ?? null,
      matchScore: h.score,
    }));

    const total = items.length;
    const slice = items.slice((safePage - 1) * safeLimit, safePage * safeLimit);
    return buildPaginatedResponse(slice, total, pagination);
  }
}
