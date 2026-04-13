/**
 * Feed Service
 *
 * Handles feed timeline generation and bookmark retrieval.
 * Builds timeline from followed users, connections, and own posts.
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
   * 1. Get followingIds from Follow table + connectionIds from Connection table (ACCEPTED)
   * 2. Query posts WHERE authorId IN [...ids, userId], isDeleted=false
   * 3. Optional type filter
   * 4. Cursor-based pagination (createdAt < cursor)
   * 5. Include whether current user liked/bookmarked each post
   * 6. Return { posts, nextCursor }
   */
  async getTimeline(userId: string, cursor?: string, limit = 20, type?: PostType) {
    // 1. Get IDs of users whose posts should appear in the feed
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

    const feedUserIds = [...new Set([...followingIds, ...connectionIds, userId])];

    // 2. Query posts
    const posts = await this.prisma.post.findMany({
      where: {
        authorId: { in: feedUserIds },
        isDeleted: false,
        ...(type ? { type } : {}),
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
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
      take: limit,
    });

    // 3. Check if current user liked/bookmarked each post
    if (posts.length > 0) {
      const postIds = posts.map((p) => p.id);

      const [likes, bookmarks] = await Promise.all([
        this.prisma.postLike.findMany({
          where: { postId: { in: postIds }, userId },
          select: { postId: true },
        }),
        this.prisma.postBookmark.findMany({
          where: { postId: { in: postIds }, userId },
          select: { postId: true },
        }),
      ]);

      const likedPostIds = new Set(likes.map((l) => l.postId));
      const bookmarkedPostIds = new Set(bookmarks.map((b) => b.postId));

      const enrichedPosts = posts.map((post) => ({
        ...post,
        isLiked: likedPostIds.has(post.id),
        isBookmarked: bookmarkedPostIds.has(post.id),
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
