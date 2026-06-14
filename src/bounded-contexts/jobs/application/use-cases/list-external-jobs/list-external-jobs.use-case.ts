/**
 * Paginated read over the locally ingested `ExternalJobListing` rows
 * (JSearch daily batch). Never touches the upstream API — the worker is
 * the only writer, so this route stays quota-free.
 *
 * Each item is annotated with the caller's `savedId` (null when not
 * saved) via a single batched lookup per page.
 */

import type { JobType, RemotePolicy } from '@prisma/client';
import type { LoggerPort } from '@/shared-kernel';
import type { PaginatedResponse } from '@/shared-kernel/schemas/common/api.types';
import { buildPaginatedResponse } from '@/shared-kernel/schemas/common/build-paginated-response';
import type {
  ExternalJobListingRecord,
  ExternalJobListingsRepositoryPort,
} from '../../../domain/ports/external-job-listings.repository.port';
import type { SavedExternalJobsRepositoryPort } from '../../../domain/ports/saved-external-jobs.repository.port';

export const POSTED_WITHIN_VALUES = ['TODAY', 'LAST_3_DAYS', 'LAST_WEEK', 'LAST_MONTH'] as const;
export type PostedWithin = (typeof POSTED_WITHIN_VALUES)[number];

const HOUR_MS = 60 * 60 * 1000;
const POSTED_WITHIN_HOURS: Record<PostedWithin, number> = {
  TODAY: 24,
  LAST_3_DAYS: 72,
  LAST_WEEK: 7 * 24,
  LAST_MONTH: 30 * 24,
};

export interface ListExternalJobsInput {
  readonly q?: string;
  readonly workMode?: readonly RemotePolicy[];
  readonly employmentType?: readonly JobType[];
  readonly postedWithin?: PostedWithin;
}

export type ExternalJobListItem = ExternalJobListingRecord & { readonly savedId: string | null };

export type ListExternalJobsResult = PaginatedResponse<ExternalJobListItem>;

export class ListExternalJobsUseCase {
  constructor(
    private readonly repository: ExternalJobListingsRepositoryPort,
    private readonly savedRepository: SavedExternalJobsRepositoryPort,
    private readonly logger: LoggerPort,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(
    input: ListExternalJobsInput,
    page = 1,
    limit = 20,
    userId?: string,
  ): Promise<ListExternalJobsResult> {
    const safeLimit = Math.min(limit, 100);
    const safePage = Math.max(1, page);

    const postedAfter = input.postedWithin
      ? new Date(this.now().getTime() - POSTED_WITHIN_HOURS[input.postedWithin] * HOUR_MS)
      : undefined;

    const { items, total } = await this.repository.listListings(
      {
        q: input.q,
        workMode: input.workMode,
        employmentType: input.employmentType,
        postedAfter,
      },
      safePage,
      safeLimit,
    );

    const savedByExternalId = userId
      ? await this.savedRepository.listSavedExternalIds(
          userId,
          items.map((item) => item.externalId),
        )
      : new Map<string, string>();

    const annotated = items.map((item) => ({
      ...item,
      savedId: savedByExternalId.get(item.externalId) ?? null,
    }));
    return buildPaginatedResponse(annotated, total, { page: safePage, limit: safeLimit });
  }
}
