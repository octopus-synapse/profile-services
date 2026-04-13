/**
 * Post Service
 *
 * Handles CRUD operations for feed posts.
 * Supports creation, retrieval, soft deletion, and cursor-based pagination.
 */

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { PostType, Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

const AUTHOR_SELECT = {
  id: true,
  name: true,
  username: true,
  photoURL: true,
} as const;

@Injectable()
export class PostService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new post.
   * Parses hashtags from content via regex.
   * If type is REPOST with originalPostId, increments repostsCount on original.
   */
  async create(
    authorId: string,
    dto: {
      type: PostType;
      subtype?: string;
      content?: string;
      hardSkills?: string[];
      softSkills?: string[];
      data?: Prisma.InputJsonValue;
      imageUrl?: string;
      linkUrl?: string;
      linkPreview?: Prisma.InputJsonValue;
      originalPostId?: string;
    },
  ) {
    const hashtags = dto.content ? this.parseHashtags(dto.content) : [];

    const post = await this.prisma.post.create({
      data: {
        authorId,
        type: dto.type,
        subtype: dto.subtype,
        content: dto.content,
        hardSkills: dto.hardSkills ?? [],
        softSkills: dto.softSkills ?? [],
        hashtags,
        data: dto.data ?? undefined,
        imageUrl: dto.imageUrl,
        linkUrl: dto.linkUrl,
        linkPreview: dto.linkPreview ?? undefined,
        originalPostId: dto.originalPostId,
      },
      include: {
        author: { select: AUTHOR_SELECT },
      },
    });

    // If this is a repost with an original post, increment repost count
    if (dto.type === 'REPOST' && dto.originalPostId) {
      await this.prisma.post.update({
        where: { id: dto.originalPostId },
        data: { repostsCount: { increment: 1 } },
      });
    }

    return post;
  }

  /**
   * Find a post by ID with author info.
   */
  async findById(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        author: { select: AUTHOR_SELECT },
        originalPost: {
          include: {
            author: { select: AUTHOR_SELECT },
          },
        },
      },
    });

    if (!post || post.isDeleted) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  /**
   * Soft delete a post. Only the author can delete their own post.
   */
  async delete(id: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
    });

    if (!post || post.isDeleted) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    return this.prisma.post.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  }

  /**
   * Get posts by a specific user with cursor-based pagination.
   */
  async getUserPosts(userId: string, cursor?: string, limit = 20) {
    const posts = await this.prisma.post.findMany({
      where: {
        authorId: userId,
        isDeleted: false,
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

    const nextCursor =
      posts.length === limit ? posts[posts.length - 1].createdAt.toISOString() : null;

    return { posts, nextCursor };
  }

  /**
   * Parse hashtags from content using regex.
   */
  private parseHashtags(content: string): string[] {
    const matches = content.match(/#\w+/g);
    if (!matches) return [];
    return [...new Set(matches.map((tag) => tag.toLowerCase()))];
  }
}
