/**
 * Awards `FIRST_BUILD` when the user creates their first BUILD post.
 * The award is idempotent so re-firing this from a duplicated event
 * is a no-op rather than an error.
 *
 * P2-#22: `AwardBadgeUseCase` is now injected by the composition root
 * (see badges *.module.ts / .composition.ts) instead of being `new`-ed
 * inside the constructor. The previous form violated the project's
 * clean-architecture invariant "wiring lives in *.module.ts via
 * useFactory" — use cases must be POJOs that depend on collaborators
 * via their constructor, never construct them.
 */

import { AwardBadgeUseCase } from '../award-badge/award-badge.use-case';

export class HandlePostCreatedUseCase {
  constructor(private readonly awardBadge: AwardBadgeUseCase) {}

  async execute(userId: string, postType: string): Promise<void> {
    if (postType === 'BUILD') {
      await this.awardBadge.execute(userId, 'FIRST_BUILD');
    }
  }
}
