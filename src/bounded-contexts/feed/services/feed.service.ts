/**
 * Feed Service
 *
 * Handles feed timeline generation and bookmark retrieval.
 * Builds timeline from followed users, connections, and own posts.
 * Includes co-authored posts and thread context.
 */

import { Injectable } from '@nestjs/common';
import type { PostType } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

const AUTHOR_SELECT = {
  id: true,
  name: true,
  username: true,
  photoURL: true,
} as const;

@Injectable()
export class FeedService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the feed timeline for a user.
   *
   * Shows posts from everyone, prioritizing content from followed users,
   * connections, co-authored posts, and the user's own posts (including scheduled).
   *
   * 1. Get followingIds from Follow table + connectionIds from Connection table (ACCEPTED)
   * 2. Query all published posts (+ own unpublished scheduled posts)
   * 3. Sort with prioritized content first (personal network), then chronological
   * 4. Optional type filter
   * 5. Cursor-based pagination (createdAt < cursor)
   * 6. Include whether current user liked/bookmarked each post
   * 7. Include thread context for threaded posts
   * 8. Return { posts, nextCursor }
   */
  async getTimeline(userId: string, cursor?: string, limit = 20, type?: PostType) {
    // 1. Get IDs of users whose posts should be prioritized in the feed
    const [followingRecords, connectionRecords] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      }),
      this.prisma.connection.findMany({
        where: {
          status: 'ACCEPTED',
          OR: [{ requesterId: userId }, { targetId: userId }],
        },
        select: { requesterId: true, targetId: true },
      }),
    ]);

    const followingIds = followingRecords.map((f) => f.followingId);
    const connectionIds = connectionRecords.map((c) =>
      c.requesterId === userId ? c.targetId : c.requesterId,
    );

    const prioritizedUserIds = new Set([...followingIds, ...connectionIds, userId]);

    // 2. Query all published posts (+ own unpublished scheduled posts) — no author filter
    const posts = await this.prisma.post.findMany({
      where: {
        isDeleted: false,
        ...(type ? { type } : {}),
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
        OR: [{ isPublished: true }, { authorId: userId, isPublished: false }],
      },
      include: {
        author: { select: AUTHOR_SELECT },
        originalPost: {
          include: {
            author: { select: AUTHOR_SELECT },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit * 3, // fetch more so prioritization has room to pick
    });

    // Sort: prioritized posts first (by author in network or co-author), then by createdAt desc
    const isPrioritized = (post: (typeof posts)[number]) =>
      prioritizedUserIds.has(post.authorId) || post.coAuthors.includes(userId);

    posts.sort((a, b) => {
      const aPrio = isPrioritized(a) ? 1 : 0;
      const bPrio = isPrioritized(b) ? 1 : 0;
      if (aPrio !== bPrio) return bPrio - aPrio;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    // Trim to requested limit
    posts.splice(limit);

    // 3. Check if current user liked/bookmarked each post
    if (posts.length > 0) {
      const postIds = posts.map((p) => p.id);

      const [likes, bookmarks] = await Promise.all([
        this.prisma.postLike.findMany({
          where: { postId: { in: postIds }, userId },
          select: { postId: true, reactionType: true },
        }),
        this.prisma.postBookmark.findMany({
          where: { postId: { in: postIds }, userId },
          select: { postId: true },
        }),
      ]);

      const likedPostMap = new Map(likes.map((l) => [l.postId, l.reactionType]));
      const bookmarkedPostIds = new Set(bookmarks.map((b) => b.postId));

      // 4. Collect thread context for threaded posts
      const threadIds = [
        ...new Set(posts.filter((p) => p.threadId).map((p) => p.threadId as string)),
      ];
      const threadPosts =
        threadIds.length > 0
          ? await this.prisma.post.findMany({
              where: {
                threadId: { in: threadIds },
                isDeleted: false,
                isPublished: true,
              },
              include: {
                author: { select: AUTHOR_SELECT },
              },
              orderBy: { createdAt: 'asc' },
            })
          : [];

      const threadMap = new Map<string, typeof threadPosts>();
      for (const tp of threadPosts) {
        if (!tp.threadId) continue;
        const existing = threadMap.get(tp.threadId) ?? [];
        existing.push(tp);
        threadMap.set(tp.threadId, existing);
      }

      const enrichedPosts = posts.map((post) => ({
        ...post,
        isLiked: likedPostMap.has(post.id),
        reactionType: likedPostMap.get(post.id) ?? null,
        isBookmarked: bookmarkedPostIds.has(post.id),
        threadPosts: post.threadId ? (threadMap.get(post.threadId) ?? []) : [],
      }));

      const nextCursor =
        enrichedPosts.length === limit
          ? enrichedPosts[enrichedPosts.length - 1].createdAt.toISOString()
          : null;

      return { posts: enrichedPosts, nextCursor };
    }

    return { posts: [], nextCursor: null };
  }

  /**
   * Get posts bookmarked by a user with cursor-based pagination.
   */
  async getBookmarks(userId: string, cursor?: string, limit = 20) {
    const bookmarks = await this.prisma.postBookmark.findMany({
      where: {
        userId,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      include: {
        post: {
          include: {
            author: { select: AUTHOR_SELECT },
            originalPost: {
              include: {
                author: { select: AUTHOR_SELECT },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Filter out deleted posts
    const validBookmarks = bookmarks.filter((b) => !b.post.isDeleted);

    const posts = validBookmarks.map((b) => ({
      ...b.post,
      bookmarkedAt: b.createdAt,
      isLiked: false,
      isBookmarked: true,
    }));

    // Check if user liked any of these posts
    if (posts.length > 0) {
      const postIds = posts.map((p) => p.id);
      const likes = await this.prisma.postLike.findMany({
        where: { postId: { in: postIds }, userId },
        select: { postId: true },
      });
      const likedPostIds = new Set(likes.map((l) => l.postId));

      for (const post of posts) {
        post.isLiked = likedPostIds.has(post.id);
      }
    }

    const nextCursor =
      bookmarks.length === limit ? bookmarks[bookmarks.length - 1].createdAt.toISOString() : null;

    return { posts, nextCursor };
  }
}
