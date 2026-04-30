/**
 * Awards `FIRST_BUILD` when the user creates their first BUILD post.
 * The award is idempotent so re-firing this from a duplicated event
 * is a no-op rather than an error.
 */

import type { LoggerPort } from '@/shared-kernel';
import { BadgesRepositoryPort } from '../../../domain/ports/badges.repository.port';
import { AwardBadgeUseCase } from '../award-badge/award-badge.use-case';

export class HandlePostCreatedUseCase {
  private readonly awardBadge: AwardBadgeUseCase;
  constructor(repository: BadgesRepositoryPort, logger: LoggerPort) {
    this.awardBadge = new AwardBadgeUseCase(repository, logger);
  }

  async execute(userId: string, postType: string): Promise<void> {
    if (postType === 'BUILD') {
      await this.awardBadge.execute(userId, 'FIRST_BUILD');
    }
  }
}
