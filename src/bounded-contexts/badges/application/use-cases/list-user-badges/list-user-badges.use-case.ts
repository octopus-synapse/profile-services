/**
 * Returns the badges awarded to a single user, projected as the
 * compact `{ kind, awardedAt }` view used by the public + private
 * controller endpoints.
 */

import type { AwardedBadgeView } from '../../../domain/entities/badge';
import { BadgesRepositoryPort } from '../../../domain/ports/badges.repository.port';

export class ListUserBadgesUseCase {
  constructor(private readonly repository: BadgesRepositoryPort) {}

  async execute(userId: string): Promise<AwardedBadgeView[]> {
    const rows = await this.repository.listForUser(userId);
    return rows.map((r) => ({ kind: r.kind, awardedAt: r.awardedAt.toISOString() }));
  }
}
