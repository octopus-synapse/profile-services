import { EventPublisher } from '@/shared-kernel';
import { JobFitProfileUpdatedEvent } from '../../domain/events';
import {
  JobFitProfileRepositoryPort,
  type SavedJobFitProfile,
} from '../../domain/ports/job-fit-profile.repository.port';
import {
  BIG_FIVE_DIMENSIONS,
  type FitDimension,
  type FitVector,
  SCHWARTZ_DIMENSIONS,
  SDT_DIMENSIONS,
} from '../../domain/types';

export class InvalidJobFitSliderError extends Error {
  constructor(dimension: string) {
    super(`Recruiter slider for ${dimension} must be in the inclusive range [0,1].`);
    this.name = 'InvalidJobFitSliderError';
  }
}

/** Recruiter sliders for the full set of 18 dimensions — every position
 * in [0,1]. Missing values are allowed (treated as "no opinion"); the
 * similarity layer reassigns weight across the populated
 * dimensions so partial profiles still produce a usable score. */
export interface JobFitSliders {
  readonly [dimension: string]: number | undefined;
}

export interface UpsertJobFitProfileInput {
  readonly jobId: string;
  readonly editedByUserId: string;
  readonly sliders: JobFitSliders;
}

/** Persists (or overwrites) the recruiter's authored JobFitProfile.
 * Input is a flat dimension→slider map; we normalise it into the
 * three-block `FitVector` shape used by the similarity math. */
export class UpsertJobFitProfileUseCase {
  constructor(
    private readonly repository: JobFitProfileRepositoryPort,
    private readonly events: EventPublisher,
  ) {}

  async execute(input: UpsertJobFitProfileInput): Promise<SavedJobFitProfile> {
    const vector = buildVector(input.sliders);
    const saved = await this.repository.upsert({
      jobId: input.jobId,
      editedByUserId: input.editedByUserId,
      vector,
    });
    // Match Score cache is keyed by jobId — the recompute worker
    // listens for this event and wipes `match:*:{ jobId }:*` entries.
    this.events.publish(
      new JobFitProfileUpdatedEvent(input.jobId, { editedByUserId: input.editedByUserId }),
    );
    return saved;
  }
}

function buildVector(sliders: JobFitSliders): FitVector {
  const bigFive: Partial<Record<FitDimension, number>> = {};
  const schwartz: Partial<Record<FitDimension, number>> = {};
  const sdt: Partial<Record<FitDimension, number>> = {};

  const assign = (
    target: Partial<Record<FitDimension, number>>,
    dimensions: readonly FitDimension[],
  ) => {
    for (const dimension of dimensions) {
      const raw = sliders[dimension];
      if (raw === undefined) continue;
      if (typeof raw !== 'number' || Number.isNaN(raw) || raw < 0 || raw > 1) {
        throw new InvalidJobFitSliderError(dimension);
      }
      target[dimension] = round3(raw);
    }
  };

  assign(bigFive, BIG_FIVE_DIMENSIONS);
  assign(schwartz, SCHWARTZ_DIMENSIONS);
  assign(sdt, SDT_DIMENSIONS);

  return { bigFive, schwartz, sdt };
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
