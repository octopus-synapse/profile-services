/**
 * Apply Theme To Resume Use Case
 *
 * All themes are public — no visibility check needed.
 */

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { ApplyThemeToResume, EventPublisher } from '@/shared-kernel';
import { ERROR_MESSAGES } from '@/shared-kernel';
import { ThemeAppliedEvent } from '../../../shared-kernel/domain/events';
import type { ResumeRepositoryPort } from '../../domain/ports/resume.repository.port';
import type { JsonValue, ThemeRepositoryPort } from '../../domain/ports/theme.repository.port';

export class ApplyThemeToResumeUseCase {
  constructor(
    private readonly themeRepo: ThemeRepositoryPort,
    private readonly resumeRepo: ResumeRepositoryPort,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(userId: string, applyThemeData: ApplyThemeToResume): Promise<void> {
    const existingResume = await this.resumeRepo.findById(applyThemeData.resumeId);

    if (!existingResume || existingResume.userId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.RESUME_ACCESS_DENIED);
    }

    const selectedTheme = await this.themeRepo.findById(applyThemeData.themeId);
    if (!selectedTheme) {
      throw new NotFoundException(ERROR_MESSAGES.THEME_NOT_FOUND);
    }

    await this.resumeRepo.applyTheme(
      applyThemeData.resumeId,
      applyThemeData.themeId,
      (applyThemeData.customizations as JsonValue) ?? null,
    );
    await this.themeRepo.incrementUsageCount(applyThemeData.themeId);

    this.eventPublisher.publish(
      new ThemeAppliedEvent(applyThemeData.themeId, {
        resumeId: applyThemeData.resumeId,
        userId,
      }),
    );
  }
}
