/**
 * Get Snapshot History Use Case
 *
 * Retrieves historical analytics snapshots for a resume.
 */

import type { AnalyticsSnapshot } from '../../../interfaces';
import type {
  ResumeOwnershipPort,
  SnapshotRepositoryPort,
} from '../../ports/resume-analytics.port';

export class GetSnapshotHistoryUseCase {
  constructor(
    private readonly ownership: ResumeOwnershipPort,
    private readonly snapshotRepo: SnapshotRepositoryPort,
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
