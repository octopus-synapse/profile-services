/**
 * CareerCohort — read-model summarising where people with a similar stack
 * are today. Used by the "career graph" view.
 *
 * Given a user's `primaryStack`, the repository finds opt-in candidates
 * whose stack overlaps by at least `SIMILARITY_THRESHOLD` (60%) and
 * aggregates them into buckets by `experienceYears`. The entity holds
 * the aggregation — it exposes behavior for finding the "median bucket"
 * and the user's position in the cohort without leaking raw rows.
 *
 * Pure domain: no framework, no Prisma. `CareerCohortBuilder.from(...)`
 * takes plain record arrays (provided by the adapter) and builds the
 * entity.
 */

export interface CohortBucket {
  readonly experienceYears: number;
  /** Peer count with this exact experience level (already filtered to ≥ threshold overlap). */
  readonly peerCount: number;
  /**
   * Top job titles in the bucket, sorted by frequency. The adapter caps
   * this at 3 so we can render chips without a second query.
   */
  readonly topJobTitles: ReadonlyArray<{ title: string; count: number }>;
}

export interface CareerCohortProps {
  readonly stack: ReadonlyArray<string>;
  readonly userExperienceYears: number;
  readonly userJobTitle: string | null;
  readonly buckets: ReadonlyArray<CohortBucket>;
}

export const SIMILARITY_THRESHOLD = 0.6;

export class CareerCohort {
  private constructor(private readonly props: CareerCohortProps) {}

  static from(props: CareerCohortProps): CareerCohort {
    return new CareerCohort({
      ...props,
      buckets: [...props.buckets].sort((a, b) => a.experienceYears - b.experienceYears),
    });
  }

  get totalPeers(): number {
    return this.props.buckets.reduce((sum, b) => sum + b.peerCount, 0);
  }

  /** Bucket closest to the user's current `experienceYears`. Null if empty. */
  currentBucket(): CohortBucket | null {
    if (this.props.buckets.length === 0) return null;
    let best: CohortBucket = this.props.buckets[0];
    let bestDistance = Math.abs(best.experienceYears - this.props.userExperienceYears);
    for (const bucket of this.props.buckets) {
      const d = Math.abs(bucket.experienceYears - this.props.userExperienceYears);
      if (d < bestDistance) {
        best = bucket;
        bestDistance = d;
      }
    }
    return best;
  }

  /**
   * Project `yearsAhead` into the future: find the cohort bucket for
   * `userExperienceYears + yearsAhead` and return its top titles. Falls
   * back to the closest bucket on either side when the exact year is
   * missing — gives a useful hint even on sparse data.
   */
  project(yearsAhead: number): CohortBucket | null {
    if (this.props.buckets.length === 0) return null;
    const target = this.props.userExperienceYears + yearsAhead;
    let best: CohortBucket = this.props.buckets[0];
    let bestDistance = Math.abs(best.experienceYears - target);
    for (const bucket of this.props.buckets) {
      const d = Math.abs(bucket.experienceYears - target);
      if (d < bestDistance) {
        best = bucket;
        bestDistance = d;
      }
    }
    return best;
  }

  toPlain(): CareerCohortProps {
    return this.props;
  }
}
