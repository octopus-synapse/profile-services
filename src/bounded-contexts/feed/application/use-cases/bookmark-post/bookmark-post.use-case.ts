/**
 * Idempotently bookmark a post; bumps `bookmarksCount` only on the first
 * insert.
 */

import { PostNotFoundException } from '../../../domain/exceptions/feed.exceptions';
import { EngagementRepositoryPort } from '../../../domain/ports/engagement.repository.port';

export class BookmarkPostUseCase {
  constructor(private readonly repository: EngagementRepositoryPort) {}

  async execute(
    postId: string,
    userId: string,
  ): Promise<{ postId: string; userId: string; alreadyBookmarked: boolean }> {
    const post = await this.repository.findPostById(postId);
    if (!post || post.isDeleted) {
      throw new PostNotFoundException(postId);
    }

    const existing = await this.repository.findBookmark(postId, userId);
    if (existing) {
      return { postId, userId, alreadyBookmarked: true };
    }

    await this.repository.createBookmark(postId, userId);
    await this.repository.incrementBookmarksCount(postId, 1);
    return { postId, userId, alreadyBookmarked: false };
  }
}
