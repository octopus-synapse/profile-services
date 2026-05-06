/**
 * Prisma adapter for `CommentRepositoryPort`. Owns the `PostComment`
 * read/write surface and the matching denormalised `Post.commentsCount`
 * updates.
 */

import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type {
  Comment,
  CommentWithAuthor,
  CommentWithPost,
  CommentWithReplies,
} from '../../../domain/entities';
import { CommentRepositoryPort } from '../../../domain/ports/comment.repository.port';

const AUTHOR_SELECT = { id: true, name: true, username: true, photoURL: true } as const;

export class PrismaCommentRepository extends CommentRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findPostById(postId: string): Promise<{ id: string; isDeleted: boolean } | null> {
    return this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, isDeleted: true },
    });
  }

  async findCommentById(id: string): Promise<Comment | null> {
    return (await this.prisma.postComment.findUnique({ where: { id } })) as Comment | null;
  }

  async createComment(input: {
    postId: string;
    authorId: string;
    content: string;
    parentId?: string;
  }): Promise<CommentWithAuthor> {
    return (await this.prisma.postComment.create({
      data: {
        postId: input.postId,
        authorId: input.authorId,
        content: input.content,
        parentId: input.parentId,
      },
      include: { author: { select: AUTHOR_SELECT } },
    })) as unknown as CommentWithAuthor;
  }

  async markCommentDeleted(id: string): Promise<Comment> {
    // P1-067 — record the soft-delete timestamp alongside the flag.
    return (await this.prisma.postComment.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    })) as Comment;
  }

  async incrementPostCommentsCount(postId: string, by: number): Promise<void> {
    await this.prisma.post.update({
      where: { id: postId },
      data: { commentsCount: { increment: by } },
    });
  }

  async listTopLevelByPost(
    postId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<CommentWithReplies[]> {
    return (await this.prisma.postComment.findMany({
      where: {
        postId,
        parentId: null,
        isDeleted: false,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      include: {
        author: { select: AUTHOR_SELECT },
        replies: {
          where: { isDeleted: false },
          include: { author: { select: AUTHOR_SELECT } },
          orderBy: { createdAt: 'asc' },
          take: 3,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })) as unknown as CommentWithReplies[];
  }

  async listRepliesByComment(
    commentId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<CommentWithAuthor[]> {
    return (await this.prisma.postComment.findMany({
      where: {
        parentId: commentId,
        isDeleted: false,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      include: { author: { select: AUTHOR_SELECT } },
      orderBy: { createdAt: 'asc' },
      take: limit,
    })) as unknown as CommentWithAuthor[];
  }

  async listByAuthor(
    userId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<CommentWithPost[]> {
    return (await this.prisma.postComment.findMany({
      where: {
        authorId: userId,
        isDeleted: false,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      include: {
        author: { select: AUTHOR_SELECT },
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
    })) as unknown as CommentWithPost[];
  }
}
