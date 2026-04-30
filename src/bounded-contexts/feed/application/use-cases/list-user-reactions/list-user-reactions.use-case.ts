/**
 * List a user's reactions across all posts (profile activity tab).
 */

import type { ReactionsResult, ReactionWithPost } from '../../../domain/entities';
import { EngagementRepositoryPort } from '../../../domain/ports/engagement.repository.port';

const MAX_LIMIT = 50;

export class ListUserReactionsUseCase {
  constructor(private readonly repository: EngagementRepositoryPort) {}

  async execute(
    userId: string,
    cursor: string | undefined,
    limit: number | undefined,
  ): Promise<ReactionsResult<ReactionWithPost>> {
    const safeLimit = Math.min(limit ?? 20, MAX_LIMIT);
    const reactions = await this.repository.listReactionsByUser(userId, cursor, safeLimit);
    const nextCursor =
      reactions.length === safeLimit
        ? reactions[reactions.length - 1].createdAt.toISOString()
        : null;
    return { reactions, nextCursor };
  }
}
