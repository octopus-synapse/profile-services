/**
 * Awards `ATS_90_PLUS` once a resume's ATS score crosses 90. The
 * threshold lives here as the only piece of policy in the BC's
 * trigger surface.
 */

import type { LoggerPort } from '@/shared-kernel';
import { BadgesRepositoryPort } from '../../../domain/ports/badges.repository.port';
import { AwardBadgeUseCase } from '../award-badge/award-badge.use-case';

const ATS_BADGE_THRESHOLD = 90;

export class HandleAtsScoreCalculatedUseCase {
  private readonly awardBadge: AwardBadgeUseCase;
  constructor(repository: BadgesRepositoryPort, logger: LoggerPort) {
    this.awardBadge = new AwardBadgeUseCase(repository, logger);
  }

  async execute(userId: string, score: number): Promise<void> {
    if (score >= ATS_BADGE_THRESHOLD) {
      await this.awardBadge.execute(userId, 'ATS_90_PLUS', { score });
    }
  }
}
