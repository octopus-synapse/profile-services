import { CareerCohort, CareerCohortRepositoryPort, type CohortBucket } from '../../../domain';
import {
  CareerCohortEmptyException,
  CareerGraphInvalidMaxBucketsException,
  CareerGraphRepositoryUnavailableException,
  CareerGraphStackRequiredException,
} from '../../../domain/exceptions/career-graph.exceptions';
import type {
  CareerGraphBucketOutput,
  CareerGraphProjectionOutput,
  ViewCareerGraphInput,
  ViewCareerGraphOutput,
} from './view-career-graph.schema';

const MAX_BUCKETS_CAP = 50;

/**
 * ViewCareerGraphUseCase — produces the data backing the "Career graph"
 * feature. Combines the requester's snapshot (years of experience + current
 * title) with the peer cohort (people sharing ≥60% of the same stack) to
 * answer two questions:
 *   (1) "Where are people like me today?" → `current` + `buckets`.
 *   (2) "Where might I be in 3 / 5 / 10 years?" → `projections`.
 *
 * Projection is a cheap closest-bucket lookup, not a statistical model.
 * Phase 2 can replace it with a time-series survival curve without
 * touching callers.
 */

const PROJECTION_HORIZONS_YEARS = [3, 5, 10] as const;

export class ViewCareerGraphUseCase {
  constructor(private readonly repo: CareerCohortRepositoryPort) {}

  async execute(input: ViewCareerGraphInput): Promise<ViewCareerGraphOutput> {
    if (input.stack.length === 0) {
      throw new CareerGraphStackRequiredException();
    }
    if (
      !Number.isFinite(input.maxBuckets) ||
      input.maxBuckets < 1 ||
      input.maxBuckets > MAX_BUCKETS_CAP
    ) {
      throw new CareerGraphInvalidMaxBucketsException(input.maxBuckets);
    }

    let snapshot: Awaited<ReturnType<CareerCohortRepositoryPort['loadRequesterSnapshot']>>;
    let rawBuckets: Awaited<ReturnType<CareerCohortRepositoryPort['loadCohortBuckets']>>;
    try {
      [snapshot, rawBuckets] = await Promise.all([
        this.repo.loadRequesterSnapshot(input.requesterId),
        this.repo.loadCohortBuckets({
          requesterId: input.requesterId,
          stack: input.stack,
          maxBuckets: input.maxBuckets,
        }),
      ]);
    } catch {
      throw new CareerGraphRepositoryUnavailableException();
    }

    if (rawBuckets.length === 0) {
      throw new CareerCohortEmptyException();
    }

    const user = snapshot ?? { experienceYears: 0, jobTitle: null };

    const cohort = CareerCohort.from({
      stack: input.stack,
      userExperienceYears: user.experienceYears,
      userJobTitle: user.jobTitle,
      buckets: rawBuckets,
    });

    const buckets = cohort.toPlain().buckets.map(toBucketOutput);

    const projections: CareerGraphProjectionOutput[] = PROJECTION_HORIZONS_YEARS.map(
      (yearsAhead) => ({ yearsAhead, bucket: projectBucket(cohort, yearsAhead) }),
    );

    const current = cohort.currentBucket();

    return {
      stack: input.stack,
      user,
      totalPeers: cohort.totalPeers,
      current: current ? toBucketOutput(current) : null,
      buckets,
      projections,
    };
  }
}

function toBucketOutput(b: CohortBucket): CareerGraphBucketOutput {
  return {
    experienceYears: b.experienceYears,
    peerCount: b.peerCount,
    topJobTitles: b.topJobTitles.map((t) => ({ title: t.title, count: t.count })),
  };
}

function projectBucket(cohort: CareerCohort, yearsAhead: number): CareerGraphBucketOutput | null {
  const b = cohort.project(yearsAhead);
  return b ? toBucketOutput(b) : null;
}
