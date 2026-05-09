/**
 * List comments authored by a user across all posts (profile activity tab).
 */

import type { CommentsResult, CommentWithPost } from '../../../domain/entities';
import { CommentRepositoryPort } from '../../../domain/ports/comment.repository.port';

const MAX_LIMIT = 50;

export class ListUserCommentsUseCase {
  constructor(private readonly repository: CommentRepositoryPort) {}

  async execute(
    userId: string,
    cursor: string | undefined,
    limit: number | undefined,
  ): Promise<CommentsResult<CommentWithPost>> {
    const safeLimit = Math.min(limit ?? 20, MAX_LIMIT);
    const comments = await this.repository.listByAuthor(userId, cursor, safeLimit);
    const nextCursor =
      comments.length === safeLimit ? comments[comments.length - 1].createdAt.toISOString() : null;
    const sanitized = comments.map(({ deletedAt: _omit, ...rest }) => rest) as CommentWithPost[];
    return { items: sanitized, nextCursor, hasNext: nextCursor !== null };
  }
}
