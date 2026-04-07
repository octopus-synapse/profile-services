/**
 * Batch Reorder Use Case
 */

import type { ResumeConfigRepositoryPort } from '../../domain/ports/resume-config.repository.port';

export class BatchReorderUseCase {
  constructor(private readonly repo: ResumeConfigRepositoryPort) {}

  async execute(
    userId: string,
    resumeId: string,
    updates: Array<{
      id: string;
      visible?: boolean;
      order?: number;
      column?: string;
    }>,
  ): Promise<void> {
    await this.repo.get(userId, resumeId);
    await this.repo.batchUpdateSectionsDirect(resumeId, updates);
  }
}
