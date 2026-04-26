/**
 * Career Cohort Repository Port (Outbound).
 *
 * The adapter is responsible for:
 *   - Filtering to opt-in public profiles (same visibility rules as the
 *     recruiting BC — `profileVisibility in (public, link)`, active,
 *     completed onboarding).
 *   - Computing the skill-overlap ratio against the requesting user's
 *     stack and dropping rows below `SIMILARITY_THRESHOLD`.
 *   - Grouping survivors by `experienceYears` and picking the top 3
 *     `jobTitle` values in each bucket.
 *   - Capping output at `maxBuckets` so the in-memory entity stays small.
 *
 * Returns plain read-models — no Prisma types leak across the port.
 */

import type { CohortBucket } from '../entities';

export interface CohortRequest {
  readonly requesterId: string;
  readonly stack: ReadonlyArray<string>;
  readonly maxBuckets: number;
}

export abstract class CareerCohortRepositoryPort {
  abstract loadCohortBuckets(input: CohortRequest): Promise<ReadonlyArray<CohortBucket>>;

  /**
   * Light read: the requester's own current `experienceYears` + `jobTitle`
   * from their primary resume. Null jobTitle is fine (early-career users).
   */
  abstract loadRequesterSnapshot(
    requesterId: string,
  ): Promise<{ experienceYears: number; jobTitle: string | null } | null>;
}
