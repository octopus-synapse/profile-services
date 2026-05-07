/**
 * List replies for a specific comment with cursor pagination.
 */

import type { CommentWithAuthor, RepliesResult } from '../../../domain/entities';
import { CommentRepositoryPort } from '../../../domain/ports/comment.repository.port';

export class ListCommentRepliesUseCase {
  constructor(private readonly repository: CommentRepositoryPort) {}

  async execute(
    commentId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<RepliesResult<CommentWithAuthor>> {
    const replies = await this.repository.listRepliesByComment(commentId, cursor, limit);
    const nextCursor =
      replies.length === limit ? replies[replies.length - 1].createdAt.toISOString() : null;
    return { items: replies, nextCursor, hasNext: nextCursor !== null };
  }
}
