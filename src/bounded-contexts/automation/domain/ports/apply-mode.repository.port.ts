/**
 * Outbound port for the apply-mode (Weekly Curated approval flow)
 * persistence operations. Adapters are expected to:
 *
 * - Resolve the current batch (most recent) for a user.
 * - Look up an item with batch-ownership info so use cases can enforce
 *   the cross-user authorization check.
 * - Update item status (APPROVED/REJECTED) with `decidedAt` and the
 *   optional `applicationId` link.
 * - Find an existing `JobApplication` for `(jobId, userId)` so approves
 *   are idempotent.
 * - Create a `JobApplication` using the user's primary resume + default
 *   cover from preferences.
 */

import type {
  ApplyModeUserDefaults,
  JobApplicationRow,
  OwnedWeeklyCuratedItem,
  WeeklyCuratedBatchRow,
} from '../entities/weekly-curated-item';

export interface UpdateItemDecisionInput {
  readonly status: 'APPROVED' | 'REJECTED';
  readonly decidedAt: Date;
  readonly applicationId?: string;
}

export interface CreateJobApplicationInput {
  readonly jobId: string;
  readonly userId: string;
  readonly resumeId: string | null;
  readonly coverLetter: string | null;
}

export abstract class ApplyModeRepositoryPort {
  abstract findCurrentBatchForUser(userId: string): Promise<WeeklyCuratedBatchRow | null>;
  abstract findItemWithOwner(itemId: string): Promise<OwnedWeeklyCuratedItem | null>;
  abstract findApplication(jobId: string, userId: string): Promise<JobApplicationRow | null>;
  abstract getUserApplicationDefaults(userId: string): Promise<ApplyModeUserDefaults>;
  abstract createApplication(input: CreateJobApplicationInput): Promise<JobApplicationRow>;
  abstract updateItemDecision(itemId: string, input: UpdateItemDecisionInput): Promise<void>;
}
