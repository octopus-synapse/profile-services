/**
 * Withdraw the current user's application to a job.
 *
 * P1 #24 — the use case is now state-machine guarded: only applications
 * still in flight (`SUBMITTED` or `VIEWED`) can be withdrawn. Withdrawing
 * a row already in a terminal state (`WITHDRAWN`, `REJECTED`, `ACCEPTED`)
 * is a no-op semantically but used to silently re-overwrite the status,
 * masking client bugs and making the "withdrew an accepted offer" audit
 * trail confusing. Now the use case throws `InvalidApplicationStateException`
 * (409 conflict) so the caller can react.
 */

import type { JobApplicationStatus } from '@prisma/client';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { InvalidApplicationStateException } from '../../../domain/exceptions/jobs.exceptions';
import { JobsRepositoryPort } from '../../../domain/ports/jobs.repository.port';

const WITHDRAWABLE_STATUSES: ReadonlySet<JobApplicationStatus> = new Set(['SUBMITTED', 'VIEWED']);

export interface WithdrawApplicationResult {
  readonly jobId: string;
  readonly userId: string;
  readonly withdrawn: true;
}

export class WithdrawApplicationUseCase {
  constructor(private readonly repository: JobsRepositoryPort) {}

  async execute(jobId: string, userId: string): Promise<WithdrawApplicationResult> {
    const app = await this.repository.findApplication(jobId, userId);
    if (!app) {
      throw new EntityNotFoundException('JobApplication', `${jobId}:${userId}`);
    }
    if (!WITHDRAWABLE_STATUSES.has(app.status)) {
      throw new InvalidApplicationStateException(app.status, 'withdraw');
    }
    await this.repository.markApplicationWithdrawn(app.id);
    return { jobId, userId, withdrawn: true };
  }
}
