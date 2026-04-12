/**
 * Get Resolved Theme Config Use Case
 */

import { ForbiddenException } from '@nestjs/common';
import { ERROR_MESSAGES } from '@/shared-kernel';
import type { ResumeRepositoryPort } from '../../domain/ports/resume.repository.port';
import { deepMerge } from '../../utils';

export class GetResolvedThemeConfigUseCase {
  constructor(private readonly resumeRepo: ResumeRepositoryPort) {}

  async execute(resumeId: string, userId: string) {
    const existingResume = await this.resumeRepo.findByIdWithTheme(resumeId);

    if (!existingResume || existingResume.userId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.RESUME_NOT_FOUND);
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
