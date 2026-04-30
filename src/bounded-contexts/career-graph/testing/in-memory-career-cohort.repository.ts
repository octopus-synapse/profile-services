import type { CohortBucket, CohortRequest } from '../domain';
import { CareerCohortRepositoryPort } from '../domain';

/**
 * In-memory cohort directory for specs. Seed with `setBuckets()` /
 * `setRequesterSnapshot()` — filtering by stack overlap is out of
 * scope for the stub (tests can pre-filter); the stub honors
 * `maxBuckets` only.
 */
export class InMemoryCareerCohortRepository implements CareerCohortRepositoryPort {
  private buckets: CohortBucket[] = [];
  private requesterSnapshot: { experienceYears: number; jobTitle: string | null } | null = null;

  setBuckets(buckets: CohortBucket[]): void {
    this.buckets = [...buckets];
  }

  setRequesterSnapshot(snapshot: { experienceYears: number; jobTitle: string | null }): void {
    this.requesterSnapshot = snapshot;
  }

  async loadCohortBuckets(input: CohortRequest): Promise<ReadonlyArray<CohortBucket>> {
    return this.buckets.slice(0, input.maxBuckets);
  }

  async loadRequesterSnapshot(
    _requesterId: string,
  ): Promise<{ experienceYears: number; jobTitle: string | null } | null> {
    return this.requesterSnapshot;
  }
}
