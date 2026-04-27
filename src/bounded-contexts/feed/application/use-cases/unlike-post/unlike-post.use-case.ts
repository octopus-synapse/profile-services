/**
 * Remove the viewer's reaction on a post; decrements `likesCount`.
 */

import { PostLikeNotFoundException } from '../../../domain/exceptions/feed.exceptions';
import { EngagementRepositoryPort } from '../../../domain/ports/engagement.repository.port';

export class UnlikePostUseCase {
  constructor(private readonly repository: EngagementRepositoryPort) {}

  async execute(postId: string, userId: string): Promise<{ postId: string; userId: string }> {
    const existing = await this.repository.findLike(postId, userId);
    if (!existing) {
      throw new PostLikeNotFoundException(postId);
    }
    await this.repository.deleteLike(postId, userId);
    await this.repository.incrementLikesCount(postId, -1);
    return { postId, userId };
  }
}
