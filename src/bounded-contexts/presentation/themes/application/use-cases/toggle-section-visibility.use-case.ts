/**
 * Toggle Section Visibility Use Case
 */

import type { ResumeConfigRepositoryPort } from '../../domain/ports/resume-config.repository.port';

export class ToggleSectionVisibilityUseCase {
  constructor(private readonly repo: ResumeConfigRepositoryPort) {}

  async execute(
    userId: string,
    resumeId: string,
    sectionId: string,
    visible: boolean,
  ): Promise<void> {
    const config = await this.repo.get(userId, resumeId);

    config.sections = config.sections.map((s) =>
      s.id === sectionId ? { ...s, visible } : s,
    );

    await this.repo.save(resumeId, config);
  }
}
