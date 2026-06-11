/**
 * Persistence port for externally ingested job listings (JSearch).
 * Method naming follows Q10: `list*` returns `[]` on miss.
 */

import type { JobType } from '@prisma/client';
import type { ExternalJobPosting } from './external-job-search.port';

export interface ExternalJobListingRecord extends ExternalJobPosting {
  readonly id: string;
  readonly dedupHash: string;
  readonly fetchedAt: Date;
  readonly sourceQuery: string;
}

export interface ExternalJobListFilters {
  /** Free-text match over title/company (case-insensitive contains). */
  readonly q?: string;
  readonly isRemote?: boolean;
  readonly employmentType?: JobType;
}

export type ExternalJobUpsertOutcome = 'created' | 'updated' | 'duplicate';

export abstract class ExternalJobListingsRepositoryPort {
  /**
   * Upserts by `externalId`; refreshes `postedAt`/`fetchedAt`/
   * `sourceQuery` on conflict. Returns 'duplicate' (no write) when the
   * `dedupHash` already exists under a different `externalId` — same
   * vacancy re-listed by another publisher.
   */
  abstract upsertByExternalId(
    posting: ExternalJobPosting,
    dedupHash: string,
    sourceQuery: string,
    fetchedAt: Date,
  ): Promise<ExternalJobUpsertOutcome>;

  abstract listListings(
    filters: ExternalJobListFilters,
    page: number,
    limit: number,
  ): Promise<{ items: ExternalJobListingRecord[]; total: number }>;

  /** Retention sweep — returns the number of rows deleted. */
  abstract deleteFetchedBefore(cutoff: Date): Promise<number>;
}
