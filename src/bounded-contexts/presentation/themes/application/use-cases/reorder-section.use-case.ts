/**
 * Reorder Section Use Case
 */

import type { ResumeConfigRepositoryPort } from '../../domain/ports/resume-config.repository.port';

export class ReorderSectionUseCase {
  constructor(private readonly repo: ResumeConfigRepositoryPort) {}

  async execute(
    userId: string,
    resumeId: string,
    sectionId: string,
    newOrder: number,
  ): Promise<void> {
    await this.repo.get(userId, resumeId);
    await this.repo.reorderSectionDirect(resumeId, sectionId, newOrder);
  }
}
