/**
 * Prisma adapter for `EngagementRepositoryPort`. Wraps the
 * like/bookmark/repost slice; keeps the transactional create-and-bump
 * counter pairs colocated with the `Post` row update.
 */

import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type {
  Post,
  PostBookmark,
  PostLike,
  PostWithAuthor,
  ReactionType,
  ReactionWithPost,
} from '../../../domain/entities';
import { EngagementRepositoryPort } from '../../../domain/ports/engagement.repository.port';

const AUTHOR_SELECT = { id: true, name: true, username: true, photoURL: true } as const;

export class PrismaEngagementRepository extends EngagementRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findPostById(id: string): Promise<Post | null> {
    return (await this.prisma.post.findUnique({ where: { id } })) as Post | null;
  }

  // ---------- Likes ----------
  async findLike(postId: string, userId: string): Promise<PostLike | null> {
    return (await this.prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    })) as PostLike | null;
  }

  async createLike(postId: string, userId: string, reactionType: ReactionType): Promise<void> {
    await this.prisma.postLike.create({ data: { postId, userId, reactionType } });
  }

  async updateLikeReaction(
    postId: string,
    userId: string,
    reactionType: ReactionType,
  ): Promise<void> {
    await this.prisma.postLike.update({
      where: { postId_userId: { postId, userId } },
      data: { reactionType },
    });
  }

  async deleteLike(postId: string, userId: string): Promise<void> {
    await this.prisma.postLike.delete({ where: { postId_userId: { postId, userId } } });
  }

  async incrementLikesCount(postId: string, by: number): Promise<void> {
    await this.prisma.post.update({
      where: { id: postId },
      data: { likesCount: { increment: by } },
    });
  }

  async listReactionsByUser(
    userId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<ReactionWithPost[]> {
    return (await this.prisma.postLike.findMany({
      where: { userId, ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}) },
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
      take: limit,
    })) as unknown as ReactionWithPost[];
  }

  // ---------- Bookmarks ----------
  async findBookmark(postId: string, userId: string): Promise<PostBookmark | null> {
    return (await this.prisma.postBookmark.findUnique({
      where: { postId_userId: { postId, userId } },
    })) as PostBookmark | null;
  }

  async createBookmark(postId: string, userId: string): Promise<void> {
    await this.prisma.postBookmark.create({ data: { postId, userId } });
  }

  async deleteBookmark(postId: string, userId: string): Promise<void> {
    await this.prisma.postBookmark.delete({ where: { postId_userId: { postId, userId } } });
  }

  async incrementBookmarksCount(postId: string, by: number): Promise<void> {
    await this.prisma.post.update({
      where: { id: postId },
      data: { bookmarksCount: { increment: by } },
    });
  }

  // ---------- Reposts ----------
  async findExistingRepost(
    originalPostId: string,
    authorId: string,
  ): Promise<{ id: string } | null> {
    return this.prisma.post.findFirst({
      where: { type: 'REPOST', originalPostId, authorId, isDeleted: false },
      select: { id: true },
    });
  }

  async createRepost(input: {
    authorId: string;
    originalPostId: string;
    content: string;
    hashtags: string[];
  }): Promise<PostWithAuthor> {
    return (await this.prisma.post.create({
      data: {
        authorId: input.authorId,
        type: 'REPOST',
        content: input.content,
        hashtags: input.hashtags,
        originalPostId: input.originalPostId,
      },
      include: { author: { select: AUTHOR_SELECT } },
    })) as unknown as PostWithAuthor;
  }

  async incrementRepostsCount(postId: string, by: number): Promise<void> {
    await this.prisma.post.update({
      where: { id: postId },
      data: { repostsCount: { increment: by } },
    });
  }
}
