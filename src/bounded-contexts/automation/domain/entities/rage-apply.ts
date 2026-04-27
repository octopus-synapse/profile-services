/**
 * Domain shapes for the rage-apply orchestrator.
 *
 * Kept as plain interfaces so the application layer can pass these
 * around without leaking Prisma row shapes. The view types mirror the
 * controller response (and the API DTO) so the use case can return a
 * typed value the controller hands straight back.
 */

import type { UserApplyCriteriaData } from '@/bounded-contexts/identity/users/application/ports/user-preferences.port';

/**
 * Subset of the user record the rage-apply pipeline needs:
 * activation, the primary resume to tailor against, and the apply
 * criteria knobs (minFit floor + default cover letter).
 */
export interface RageApplyUserSnapshot {
  readonly isActive: boolean;
  readonly primaryResumeId: string | null;
  readonly applyCriteria: UserApplyCriteriaData | null;
}

/**
 * Per-job failure rolled up in the result. `reason` is human-readable
 * and surfaces straight to the API consumer, so adapters should keep
 * messages free of internal stack data.
 */
export interface RageApplyFailure {
  readonly jobId: string;
  readonly reason: string;
}

/**
 * Aggregate outcome of a rage-apply run. `attempted` is the candidate
 * pool size after curated-selector filtering, not the number of
 * submissions actually issued.
 */
export interface RageApplyResult {
  readonly attempted: number;
  readonly submitted: number;
  readonly skippedExisting: number;
  readonly failed: RageApplyFailure[];
}

/**
 * Payload accepted by the use case. `since` defaults to ~7 days back
 * inside the use case if omitted; bounds are enforced upstream by the
 * controller's Zod schema.
 */
export interface RageApplyInput {
  readonly userId: string;
  readonly minFit?: number;
  readonly maxApplications?: number;
  readonly since?: Date;
}
