/**
 * Get Resolved Theme Config Use Case
 */

import { ResumeAccessDeniedException } from '../../../domain/exceptions/presentation.exceptions';
import type { ResumeRepositoryPort } from '../../domain/ports/resume.repository.port';
import { deepMerge } from '../../utils';

export class GetResolvedThemeConfigUseCase {
  constructor(private readonly resumeRepo: ResumeRepositoryPort) {}

  async execute(resumeId: string, userId: string) {
    const existingResume = await this.resumeRepo.findByIdWithTheme(resumeId);

    if (!existingResume || existingResume.userId !== userId) {
      throw new ResumeAccessDeniedException();
    }

    if (!existingResume.activeTheme) {
      return null;
    }

    const baseThemeConfig = existingResume.activeTheme.styleConfig as Record<string, unknown>;
    const customThemeOverrides = existingResume.customTheme as Record<string, unknown> | null;

    if (!customThemeOverrides) return baseThemeConfig;

    return deepMerge(baseThemeConfig, customThemeOverrides);
  }
}
