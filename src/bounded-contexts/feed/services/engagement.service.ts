/**
 * Engagement Service
 *
 * Handles likes, bookmarks, and reposts on posts.
 * Manages denormalized counters on the Post model.
 */

import { Injectable } from '@nestjs/common';
import type { ReactionType } from '@prisma/client';
import { NotificationService } from '@/bounded-contexts/notifications/services/notification.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  ConflictException,
  EntityNotFoundException,
} from '@/shared-kernel/exceptions/domain.exceptions';

const AUTHOR_SELECT = {
  id: true,
  name: true,
  username: true,
  photoURL: true,
} as const;

@Injectable()
export class EngagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Like/react to a post. Uses upsert to handle reaction changes.
   * Increments likesCount on first reaction, updates on subsequent.
   */
  async like(postId: string, userId: string, reactionType: ReactionType = 'LIKE') {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.isDeleted) {
      throw new EntityNotFoundException('Post', postId);
    }

    // Check if already reacted
    const existing = await this.prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      // If same reaction type, it's already liked
      if (existing.reactionType === reactionType) {
        return { postId, userId, reactionType, alreadyLiked: true };
      }

      // Different reaction type: update it
      await this.prisma.postLike.update({
        where: { postId_userId: { postId, userId } },
        data: { reactionType },
      });

      return {
        postId,
        userId,
        reactionType,
        postAuthorId: post.authorId,
        alreadyLiked: false,
        updated: true,
      };
    }

    await this.prisma.$transaction([
      this.prisma.postLike.create({
        data: { postId, userId, reactionType },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { likesCount: { increment: 1 } },
      }),
    ]);

    await this.notificationService.create(
      post.authorId,
      'POST_LIKED',
      userId,
      `reacted to your post`,
      'post',
      postId,
    );

    return {
      postId,
      userId,
      reactionType,
      postAuthorId: post.authorId,
      alreadyLiked: false,
    };
  }

  /**
   * Unlike a post. Decrements likesCount.
   */
  async unlike(postId: string, userId: string) {
    const existing = await this.prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (!existing) {
      throw new EntityNotFoundException('Like', postId);
    }

    await this.prisma.$transaction([
      this.prisma.postLike.delete({
        where: { postId_userId: { postId, userId } },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { likesCount: { decrement: 1 } },
      }),
    ]);

    return { postId, userId };
  }

  /**
   * Bookmark a post. Uses upsert-like logic to be idempotent.
   * Increments bookmarksCount.
   */
  async bookmark(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.isDeleted) {
      throw new EntityNotFoundException('Post', postId);
    }

    const existing = await this.prisma.postBookmark.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      return { postId, userId, alreadyBookmarked: true };
    }

    await this.prisma.$transaction([
      this.prisma.postBookmark.create({
        data: { postId, userId },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { bookmarksCount: { increment: 1 } },
      }),
    ]);

    return { postId, userId, alreadyBookmarked: false };
  }

  /**
   * Remove a bookmark from a post. Decrements bookmarksCount.
   */
  async unbookmark(postId: string, userId: string) {
    const existing = await this.prisma.postBookmark.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (!existing) {
      throw new EntityNotFoundException('Bookmark', postId);
    }

    await this.prisma.$transaction([
      this.prisma.postBookmark.delete({
        where: { postId_userId: { postId, userId } },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { bookmarksCount: { decrement: 1 } },
      }),
    ]);

    return { postId, userId };
  }

  /**
   * Repost a post.
   * Prevents duplicate reposts by the same user on the same post.
   * If commentary is provided, creates a new Post with type REPOST and content = commentary.
   * If no commentary, just increments repostsCount on the original.
   */
  async repost(postId: string, userId: string, commentary?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.isDeleted) {
      throw new EntityNotFoundException('Post', postId);
    }

    // Check for duplicate repost
    const existingRepost = await this.prisma.post.findFirst({
      where: {
        type: 'REPOST',
        originalPostId: postId,
        authorId: userId,
        isDeleted: false,
      },
    });

    if (existingRepost) {
      throw new ConflictException('You have already reposted this post');
    }

    if (commentary) {
      // Create a new repost with commentary
      const hashtags = this.parseHashtags(commentary);

      const repost = await this.prisma.post.create({
        data: {
          authorId: userId,
          type: 'REPOST',
          content: commentary,
          hashtags,
          originalPostId: postId,
        },
        include: {
          author: { select: AUTHOR_SELECT },
        },
      });

      await this.prisma.post.update({
        where: { id: postId },
        data: { repostsCount: { increment: 1 } },
      });

      await this.notificationService.create(
        post.authorId,
        'POST_REPOSTED',
        userId,
        `reposted your post`,
        'post',
        postId,
      );

      return repost;
    }

    // Simple repost without commentary
    await this.prisma.post.update({
      where: { id: postId },
      data: { repostsCount: { increment: 1 } },
    });

    await this.notificationService.create(
      post.authorId,
      'POST_REPOSTED',
      userId,
      `reposted your post`,
      'post',
      postId,
    );

    return { postId, userId, reposted: true };
  }

  /**
   * Check if a post is liked by a user.
   */
  async isLikedByUser(postId: string, userId: string): Promise<boolean> {
    const like = await this.prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    return like !== null;
  }

  /**
   * Check if a post is bookmarked by a user.
   */
  async isBookmarkedByUser(postId: string, userId: string): Promise<boolean> {
    const bookmark = await this.prisma.postBookmark.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    return bookmark !== null;
  }

  /**
   * Parse hashtags from content.
   */
  private parseHashtags(content: string): string[] {
    const matches = content.match(/#\w+/g);
    if (!matches) return [];
    return [...new Set(matches.map((tag) => tag.toLowerCase()))];
  }

  /**
   * List a user's reactions across posts (for profile activity tab).
   * Cursor-paginated by createdAt DESC.
   */
  async getReactionsByUser(userId: string, cursor?: string, limit = 20) {
    const safeLimit = Math.min(limit, 50);

    const reactions = await this.prisma.postLike.findMany({
      where: {
        userId,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      include: {
        post: {
          select: {
            id: true,
            type: true,
            content: true,
            authorId: true,
            author: { select: AUTHOR_SELECT },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
    });

    const nextCursor =
      reactions.length === safeLimit
        ? reactions[reactions.length - 1].createdAt.toISOString()
        : null;

    return { reactions, nextCursor };
  }
}
