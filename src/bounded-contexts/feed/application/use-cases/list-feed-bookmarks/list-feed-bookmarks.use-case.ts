/**
 * Return a cursor-paginated page of posts the viewer has bookmarked.
 * Filters out bookmarks whose post has since been soft-deleted, and
 * decorates each post with `isLiked` so the UI can show the heart state
 * without an extra round-trip.
 */

import type { BookmarkedFeedItem, BookmarksResult } from '../../../domain/entities';
import { FeedRepositoryPort } from '../../../domain/ports/feed.repository.port';

export class ListFeedBookmarksUseCase {
  constructor(private readonly repository: FeedRepositoryPort) {}

  async execute(
    userId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<BookmarksResult> {
    const { posts, nextCursor } = await this.repository.listBookmarks(userId, cursor, limit);

    if (posts.length === 0) {
      return { posts: [], nextCursor };
    }

    const postIds = posts.map((p) => p.id);
    const likedPostIds = await this.repository.findLikedPostIds(postIds, userId);

    const decorated: BookmarkedFeedItem[] = posts.map((p) => ({
      ...p,
      isLiked: likedPostIds.has(p.id),
    }));

    return { posts: decorated, nextCursor };
  }
}
