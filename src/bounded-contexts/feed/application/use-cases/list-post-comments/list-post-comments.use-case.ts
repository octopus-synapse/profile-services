/**
 * List top-level comments on a post (with up to 3 inline replies each).
 */

import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import type {
  CommentsResult,
  CommentWithAuthor,
  CommentWithReplies,
} from '../../../domain/entities';
import { CommentRepositoryPort } from '../../../domain/ports/comment.repository.port';

function stripDeletedAt<T extends CommentWithAuthor>(c: T): Omit<T, 'deletedAt'> {
  const { deletedAt: _omit, ...rest } = c;
  return rest;
}

export class ListPostCommentsUseCase {
  constructor(private readonly repository: CommentRepositoryPort) {}

  async execute(
    postId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<CommentsResult<CommentWithReplies>> {
    const post = await this.repository.findPostById(postId);
    if (!post || post.isDeleted) {
      throw new EntityNotFoundException('Post', postId);
    }
    const comments = await this.repository.listTopLevelByPost(postId, cursor, limit);
    const nextCursor =
      comments.length === limit ? comments[comments.length - 1].createdAt.toISOString() : null;
    const sanitized = comments.map((c) => ({
      ...stripDeletedAt(c),
      replies: c.replies.map((r) => stripDeletedAt(r)),
    })) as unknown as CommentWithReplies[];
    return { items: sanitized, nextCursor, hasNext: nextCursor !== null };
  }
}
