/**
 * Get Snapshot History Use Case
 *
 * Retrieves historical analytics snapshots for a resume.
 */

import { LoggerPort } from '@/shared-kernel';
import type { AnalyticsSnapshot } from '../../../interfaces';
import { ResumeOwnershipPort, SnapshotRepositoryPort } from '../../ports/resume-analytics.port';

export class GetSnapshotHistoryUseCase {
  constructor(
    private readonly ownership: ResumeOwnershipPort,
    private readonly snapshotRepo: SnapshotRepositoryPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(
    resumeId: string,
    userId: string,
    query?: { limit?: number },
  ): Promise<AnalyticsSnapshot[]> {
    await this.ownership.verifyOwnership(resumeId, userId);
    return this.snapshotRepo.getHistory(resumeId, query?.limit);
  }
}
