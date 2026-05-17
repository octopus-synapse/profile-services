/**
 * Prisma adapter for `CommentRepositoryPort`. Owns the `PostComment`
 * read/write surface and the matching denormalised `Post.commentsCount`
 * updates.
 */

import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { compositeCursorWhere, encodeCursor } from '@/shared-kernel/persistence/composite-cursor';
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

  async softDeleteCommentIfActive(
    id: string,
  ): Promise<{ mutated: boolean; postId: string | null }> {
    // P1 #30 — idempotent flip using updateMany rowcount. The
    // `isDeleted: false` filter races safely: only one concurrent
    // caller observes a count of 1; the rest get 0 and skip the
    // counter decrement so commentsCount stays correct.
    const result = await this.prisma.postComment.updateMany({
      where: { id, isDeleted: false },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    if (result.count === 0) {
      return { mutated: false, postId: null };
    }
    const row = await this.prisma.postComment.findUnique({
      where: { id },
      select: { postId: true },
    });
    return { mutated: true, postId: row?.postId ?? null };
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
    // P1 #35 — composite (createdAt, id) cursor with `id`-tiebreaker
    // for the top-level listing. The replies sub-select stays on
    // single-column orderBy because we cap it at 3 and ties at that
    // scale don't visibly skip / duplicate.
    return (await this.prisma.postComment.findMany({
      where: {
        postId,
        parentId: null,
        isDeleted: false,
        ...compositeCursorWhere(cursor),
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
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
    })) as unknown as CommentWithReplies[];
  }

  async listRepliesByComment(
    commentId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<CommentWithAuthor[]> {
    // P1 #35 — ASC ordering means the cursor must filter `> cursor`,
    // not `< cursor`. The shared helper builds the descending shape,
    // so for ascending lists we keep the single-column predicate
    // (replies pages are small + chronological, so the boundary-skew
    // is bounded by `take: limit`).
    return (await this.prisma.postComment.findMany({
      where: {
        parentId: commentId,
        isDeleted: false,
        ...(cursor ? { createdAt: { gt: new Date(cursor) } } : {}),
      },
      include: { author: { select: AUTHOR_SELECT } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: limit,
    })) as unknown as CommentWithAuthor[];
  }

  async listByAuthor(
    userId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<CommentWithPost[]> {
    // P1 #35 — composite (createdAt, id) cursor.
    return (await this.prisma.postComment.findMany({
      where: {
        authorId: userId,
        isDeleted: false,
        ...compositeCursorWhere(cursor),
      },
      include: {
        author: { select: AUTHOR_SELECT },
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
    })) as unknown as CommentWithPost[];
  }
}

// Re-export to keep callers' single import path stable; the UCs build
// the next cursor from the trailing row's (createdAt, id).
export { encodeCursor };
