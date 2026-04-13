/**
 * Comment Service
 *
 * Handles CRUD operations for post comments and replies.
 * Manages denormalized commentsCount on posts.
 */

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

const AUTHOR_SELECT = {
  id: true,
  name: true,
  username: true,
  photoURL: true,
} as const;

@Injectable()
export class CommentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a comment on a post. Optionally a reply to another comment.
   * Increments post.commentsCount.
   */
  async create(postId: string, authorId: string, content: string, parentId?: string) {
    // Verify post exists
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.isDeleted) {
      throw new NotFoundException('Post not found');
    }

    // If replying, verify parent comment exists
    if (parentId) {
      const parent = await this.prisma.postComment.findUnique({
        where: { id: parentId },
      });

      if (!parent || parent.isDeleted) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    const [comment] = await this.prisma.$transaction([
      this.prisma.postComment.create({
        data: {
          postId,
          authorId,
          content,
          parentId,
        },
        include: {
          author: { select: AUTHOR_SELECT },
        },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { commentsCount: { increment: 1 } },
      }),
    ]);

    return comment;
  }

  /**
   * Get top-level comments for a post with cursor-based pagination.
   * Includes up to 3 replies per comment.
   */
  async getByPost(postId: string, cursor?: string, limit = 20) {
    const comments = await this.prisma.postComment.findMany({
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
          include: {
            author: { select: AUTHOR_SELECT },
          },
          orderBy: { createdAt: 'asc' },
          take: 3,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const nextCursor =
      comments.length === limit ? comments[comments.length - 1].createdAt.toISOString() : null;

    return { comments, nextCursor };
  }

  /**
   * Soft delete a comment. Only the author can delete.
   * Decrements post.commentsCount.
   */
  async delete(id: string, userId: string) {
    const comment = await this.prisma.postComment.findUnique({
      where: { id },
    });

    if (!comment || comment.isDeleted) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    const [updatedComment] = await this.prisma.$transaction([
      this.prisma.postComment.update({
        where: { id },
        data: { isDeleted: true },
      }),
      this.prisma.post.update({
        where: { id: comment.postId },
        data: { commentsCount: { decrement: 1 } },
      }),
    ]);

    return updatedComment;
  }

  /**
   * Get replies for a specific comment with cursor-based pagination.
   */
  async getReplies(commentId: string, cursor?: string, limit = 20) {
    const replies = await this.prisma.postComment.findMany({
      where: {
        parentId: commentId,
        isDeleted: false,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      include: {
        author: { select: AUTHOR_SELECT },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    const nextCursor =
      replies.length === limit ? replies[replies.length - 1].createdAt.toISOString() : null;

    return { replies, nextCursor };
  }
}
