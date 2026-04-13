/**
 * Engagement Service
 *
 * Handles likes, bookmarks, and reposts on posts.
 * Manages denormalized counters on the Post model.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

const AUTHOR_SELECT = {
  id: true,
  name: true,
  username: true,
  photoURL: true,
} as const;

@Injectable()
export class EngagementService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Like a post. Uses upsert to be idempotent.
   * Increments likesCount. Returns event data for notifications.
   */
  async like(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.isDeleted) {
      throw new NotFoundException('Post not found');
    }

    // Check if already liked
    const existing = await this.prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      return { postId, userId, alreadyLiked: true };
    }

    await this.prisma.$transaction([
      this.prisma.postLike.create({
        data: { postId, userId },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { likesCount: { increment: 1 } },
      }),
    ]);

    return {
      postId,
      userId,
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
      throw new NotFoundException('Like not found');
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
      throw new NotFoundException('Post not found');
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
      throw new NotFoundException('Bookmark not found');
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
   * If commentary is provided, creates a new Post with type REPOST and content = commentary.
   * If no commentary, just increments repostsCount on the original.
   */
  async repost(postId: string, userId: string, commentary?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.isDeleted) {
      throw new NotFoundException('Post not found');
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

      return repost;
    }

    // Simple repost without commentary
    await this.prisma.post.update({
      where: { id: postId },
      data: { repostsCount: { increment: 1 } },
    });

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
}
