/**
 * Withdraw the current user's application to a job. Sets the row's
 * status to `WITHDRAWN`; downstream filters drop withdrawn rows from
 * "my applications" listings so it disappears from the user's view.
 */

import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { JobsRepositoryPort } from '../../../domain/ports/jobs.repository.port';

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
    await this.repository.markApplicationWithdrawn(app.id);
    return { jobId, userId, withdrawn: true };
  }
}
