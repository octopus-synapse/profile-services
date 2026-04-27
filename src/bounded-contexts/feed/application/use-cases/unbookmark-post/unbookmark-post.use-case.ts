/**
 * Remove a bookmark; decrements `bookmarksCount`.
 */

import { PostBookmarkNotFoundException } from '../../../domain/exceptions/feed.exceptions';
import { EngagementRepositoryPort } from '../../../domain/ports/engagement.repository.port';

export class UnbookmarkPostUseCase {
  constructor(private readonly repository: EngagementRepositoryPort) {}

  async execute(postId: string, userId: string): Promise<{ postId: string; userId: string }> {
    const existing = await this.repository.findBookmark(postId, userId);
    if (!existing) {
      throw new PostBookmarkNotFoundException(postId);
    }
    await this.repository.deleteBookmark(postId, userId);
    await this.repository.incrementBookmarksCount(postId, -1);
    return { postId, userId };
  }
}
