/**
 * Persistence-shaped row aggregates used by the apply-mode use cases.
 * These are the boundary types returned from `ApplyModeRepositoryPort`;
 * the controller-facing projections live in `weekly-curated-batch-view`.
 */

export interface WeeklyCuratedItemRow {
  readonly id: string;
  readonly jobId: string;
  readonly matchScore: number;
  readonly status: string;
  readonly decidedAt: Date | null;
}

export interface WeeklyCuratedBatchRow {
  readonly id: string;
  readonly weekOf: Date;
  readonly sentAt: Date | null;
  readonly status: string;
  readonly items: ReadonlyArray<WeeklyCuratedItemRow>;
}

export interface OwnedWeeklyCuratedItem {
  readonly id: string;
  readonly jobId: string;
  readonly userId: string;
}

export interface ApplyModeUserDefaults {
  readonly primaryResumeId: string | null;
  readonly defaultCover: string | null;
}

export interface JobApplicationRow {
  readonly id: string;
}
