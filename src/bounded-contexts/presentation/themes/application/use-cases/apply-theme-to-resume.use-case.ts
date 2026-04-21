/**
 * Apply Theme To Resume Use Case
 *
 * All themes are public — no visibility check needed.
 */

import { type ApplyThemeToResume, EventPublisherPort } from '@/shared-kernel';
import {
  ResumeAccessDeniedException,
  ThemeNotFoundException,
} from '../../../domain/exceptions/presentation.exceptions';
import { ThemeAppliedEvent } from '../../../shared-kernel/domain/events';
import type { ResumeRepositoryPort } from '../../domain/ports/resume.repository.port';
import type { JsonValue, ThemeRepositoryPort } from '../../domain/ports/theme.repository.port';

export class ApplyThemeToResumeUseCase {
  constructor(
    private readonly themeRepo: ThemeRepositoryPort,
    private readonly resumeRepo: ResumeRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(userId: string, applyThemeData: ApplyThemeToResume): Promise<void> {
    const existingResume = await this.resumeRepo.findById(applyThemeData.resumeId);

    if (!existingResume || existingResume.userId !== userId) {
      throw new ResumeAccessDeniedException();
    }

    const selectedTheme = await this.themeRepo.findById(applyThemeData.themeId);
    if (!selectedTheme) {
      throw new ThemeNotFoundException();
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
