/**
 * View shape returned to apply-mode controller endpoints. ISO strings on
 * dates so HTTP serialization is one-shot — the use case projects from
 * the persistence rows into this shape.
 */

export interface WeeklyCuratedItemView {
  readonly id: string;
  readonly jobId: string;
  readonly matchScore: number;
  readonly status: string;
  readonly decidedAt: string | null;
}

export interface WeeklyCuratedBatchView {
  readonly id: string;
  readonly weekOf: string;
  readonly sentAt: string | null;
  readonly status: string;
  readonly items: ReadonlyArray<WeeklyCuratedItemView>;
}
