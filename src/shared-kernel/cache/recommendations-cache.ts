/**
 * Cross-BC contract for precomputed job recommendations.
 *
 * The `job-match` BC's daily-recommendations worker WRITES the ranked
 * top-N matches for a user; the `jobs` BC's `GET /v1/jobs/recommended`
 * READS them and hydrates the external listings. Sharing the cache key +
 * record shape here (shared-kernel) keeps the two BCs decoupled — neither
 * imports the other, they only agree on this contract.
 */

export const RECOMMENDATIONS_CACHE_VERSION = 'v1';

/** Cache key for a user's precomputed recommendations. */
export function recommendationsCacheKey(userId: string): string {
  return `match:recommendations:${RECOMMENDATIONS_CACHE_VERSION}:${userId}`;
}

/**
 * TTL slightly longer than the 3-day cron cadence so a single missed
 * tick doesn't blank the Recomendadas section.
 */
export const RECOMMENDATIONS_TTL_SECONDS = 4 * 24 * 60 * 60;

/** One ranked recommendation: an external listing id + its 0–100 match. */
export interface RecommendedMatch {
  readonly externalJobId: string;
  readonly score: number;
}
