/**
 * List a user's likes across all posts (profile activity tab).
 *
 * Renamed from `ListUserReactionsUseCase` after the five-reaction picker
 * was retired — every PostLike row is now a LIKE.
 */

import type { LikeWithPost, ReactionsResult } from '../../../domain/entities';
import { EngagementRepositoryPort } from '../../../domain/ports/engagement.repository.port';

const MAX_LIMIT = 50;

export class ListUserLikesUseCase {
  constructor(private readonly repository: EngagementRepositoryPort) {}

  async execute(
    userId: string,
    cursor: string | undefined,
    limit: number | undefined,
  ): Promise<ReactionsResult<LikeWithPost>> {
    const safeLimit = Math.min(limit ?? 20, MAX_LIMIT);
    const likes = await this.repository.listLikesByUser(userId, cursor, safeLimit);
    const nextCursor =
      likes.length === safeLimit ? likes[likes.length - 1].createdAt.toISOString() : null;
    const sanitized = likes.map(({ postId, userId, createdAt, post }) => ({
      postId,
      userId,
      createdAt,
      post,
    })) as LikeWithPost[];
    return { items: sanitized, nextCursor, hasNext: nextCursor !== null };
  }
}
