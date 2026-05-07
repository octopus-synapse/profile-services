/**
 * List top-level comments on a post (with up to 3 inline replies each).
 */

import type { CommentsResult, CommentWithReplies } from '../../../domain/entities';
import { CommentRepositoryPort } from '../../../domain/ports/comment.repository.port';

export class ListPostCommentsUseCase {
  constructor(private readonly repository: CommentRepositoryPort) {}

  async execute(
    postId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<CommentsResult<CommentWithReplies>> {
    const comments = await this.repository.listTopLevelByPost(postId, cursor, limit);
    const nextCursor =
      comments.length === limit ? comments[comments.length - 1].createdAt.toISOString() : null;
    return { items: comments, nextCursor, hasNext: nextCursor !== null };
  }
}
