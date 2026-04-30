/**
 * Awards `INTERVIEWS_5` once the user reaches 5 ACCEPTED job
 * applications (proxy for "5 interviews scheduled" in the current
 * data model).
 */

import type { LoggerPort } from '@/shared-kernel';
import { BadgesRepositoryPort } from '../../../domain/ports/badges.repository.port';
import { AwardBadgeUseCase } from '../award-badge/award-badge.use-case';

const INTERVIEWS_BADGE_THRESHOLD = 5;

export class HandleInterviewScheduledUseCase {
  private readonly awardBadge: AwardBadgeUseCase;
  constructor(
    private readonly repository: BadgesRepositoryPort,
    logger: LoggerPort,
  ) {
    this.awardBadge = new AwardBadgeUseCase(repository, logger);
  }

  async execute(userId: string): Promise<void> {
    const count = await this.repository.countAcceptedApplications(userId);
    if (count >= INTERVIEWS_BADGE_THRESHOLD) {
      await this.awardBadge.execute(userId, 'INTERVIEWS_5', { count });
    }
  }
}
