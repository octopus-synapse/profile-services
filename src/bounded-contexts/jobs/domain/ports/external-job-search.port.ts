/**
 * Port over an external job-listings aggregator (JSearch / RapidAPI
 * today). The adapter returns framework-free postings already mapped to
 * our vocabulary; persistence and quota accounting live elsewhere
 * (`ExternalJobListingsRepositoryPort` / `JSearchQuotaService`).
 */

import type { JobType, RemotePolicy } from '@prisma/client';

export interface ExternalJobSearchParams {
  /** Free-text search term, e.g. 'desenvolvedor'. */
  readonly query: string;
  /** ISO-2 country code the upstream geo-scopes results to, e.g. 'br'. */
  readonly country: string;
  readonly datePosted: 'all' | 'today' | '3days' | 'week' | 'month';
  /** Upstream vocabulary (FULLTIME / CONTRACTOR / PARTTIME / INTERN). */
  readonly employmentTypes: readonly string[];
  /**
   * Page-depth ceiling. Upstream bills 1 credit per page actually
   * returned, so this is also the worst-case credit cost of the call.
   */
  readonly numPages: number;
}

export interface ExternalJobPosting {
  readonly externalId: string;
  readonly title: string;
  readonly company: string;
  readonly location: string | null;
  readonly isRemote: boolean;
  /**
   * REMOTE from the upstream flag; HYBRID inferred from title/description
   * keywords (`deriveWorkMode`); ONSITE otherwise.
   */
  readonly workMode: RemotePolicy;
  readonly employmentType: JobType | null;
  readonly applyUrl: string;
  readonly publisher: string | null;
  readonly description: string | null;
  readonly postedAt: Date | null;
  /** Upstream payload minus the description (kept in its own column). */
  readonly raw: Record<string, unknown>;
}

export interface ExternalJobSearchResult {
  readonly postings: ExternalJobPosting[];
  /**
   * Credits the call actually consumed upstream: 1 per page returned
   * (`ceil(results / 10)`, min 1 — an empty response still bills the
   * first page).
   */
  readonly creditsConsumed: number;
}

export abstract class ExternalJobSearchPort {
  abstract search(params: ExternalJobSearchParams): Promise<ExternalJobSearchResult>;
}
