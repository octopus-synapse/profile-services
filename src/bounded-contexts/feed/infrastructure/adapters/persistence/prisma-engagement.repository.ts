/**
 * Prisma adapter for `EngagementRepositoryPort`. Wraps the
 * like/bookmark/repost slice; keeps the transactional create-and-bump
 * counter pairs colocated with the `Post` row update.
 */

import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { compositeCursorWhere } from '@/shared-kernel/persistence/composite-cursor';
import type {
  LikeWithPost,
  Post,
  PostBookmark,
  PostLike,
  PostWithAuthor,
} from '../../../domain/entities';
import { EngagementRepositoryPort } from '../../../domain/ports/engagement.repository.port';
import { POST_WITH_AUTHOR_INCLUDE, toPostWithAuthor } from './post-row.mappers';

const AUTHOR_SELECT = {
  id: true,
  name: true,
  username: true,
  photoURL: true,
  headline: true,
} as const;

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

  async createLike(postId: string, userId: string): Promise<void> {
    await this.prisma.postLike.create({ data: { postId, userId } });
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

  async listLikesByUser(
    userId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<LikeWithPost[]> {
    // P1 #35 — composite (createdAt, id) cursor over the PostLike
    // row's own timestamp. A user liking N posts in the same
    // millisecond used to drop one across the page boundary; the
    // `id`-tiebreaker fixes it.
    return (await this.prisma.postLike.findMany({
      where: { userId, ...compositeCursorWhere(cursor) },
      include: {
        post: {
          select: {
            id: true,
            content: true,
            authorId: true,
            author: { select: AUTHOR_SELECT },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
    })) as LikeWithPost[];
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
      where: { isRepost: true, originalPostId, authorId, isDeleted: false },
      select: { id: true },
    });
  }

  async createRepost(input: {
    authorId: string;
    originalPostId: string;
    content: string;
    hashtags: string[];
  }): Promise<PostWithAuthor> {
    return toPostWithAuthor(
      await this.prisma.post.create({
        data: {
          authorId: input.authorId,
          isRepost: true,
          content: input.content,
          hashtags: input.hashtags,
          originalPostId: input.originalPostId,
        },
        include: POST_WITH_AUTHOR_INCLUDE,
      }),
    );
  }

  async incrementRepostsCount(postId: string, by: number): Promise<void> {
    await this.prisma.post.update({
      where: { id: postId },
      data: { repostsCount: { increment: by } },
    });
  }
}
