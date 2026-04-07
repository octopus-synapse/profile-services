/**
 * Apply Theme To Resume Use Case
 */

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma, ThemeStatus } from '@prisma/client';
import type { ApplyThemeToResume, EventPublisher } from '@/shared-kernel';
import { ERROR_MESSAGES } from '@/shared-kernel';
import { ThemeAppliedEvent } from '../../../shared-kernel/domain/events';
import type { ResumeRepositoryPort } from '../../domain/ports/resume.repository.port';
import type { ThemeRepositoryPort } from '../../domain/ports/theme.repository.port';

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

    // Verify theme access
    const selectedTheme = await this.themeRepo.findByIdWithAuthor(applyThemeData.themeId);
    if (
      !selectedTheme ||
      (selectedTheme.status !== ThemeStatus.PUBLISHED && selectedTheme.authorId !== userId)
    ) {
      throw new NotFoundException(ERROR_MESSAGES.THEME_ACCESS_DENIED);
    }

    // Apply theme and increment usage
    await this.resumeRepo.applyTheme(
      applyThemeData.resumeId,
      applyThemeData.themeId,
      (applyThemeData.customizations ?? Prisma.JsonNull) as Prisma.InputJsonValue,
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
