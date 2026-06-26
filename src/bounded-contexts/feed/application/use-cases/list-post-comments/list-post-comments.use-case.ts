/**
 * List top-level comments on a post (with up to 3 inline replies each).
 */

import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { nextCursorFromPage } from '@/shared-kernel/persistence/composite-cursor';
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

/** Read view served to the API: `deletedAt` is intentionally dropped (the
 *  comment response schema omits it), so the use case's output type
 *  reflects the stripped shape instead of asserting back to the full
 *  entity. */
type CommentWithRepliesView = Omit<CommentWithReplies, 'deletedAt' | 'replies'> & {
  readonly replies: Omit<CommentWithAuthor, 'deletedAt'>[];
};

export class ListPostCommentsUseCase {
  constructor(private readonly repository: CommentRepositoryPort) {}

  async execute(
    postId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<CommentsResult<CommentWithRepliesView>> {
    const post = await this.repository.findPostById(postId);
    if (!post || post.isDeleted) {
      throw new EntityNotFoundException('Post', postId);
    }
    const comments = await this.repository.listTopLevelByPost(postId, cursor, limit);
    // P1 #35 — composite (createdAt, id) cursor so two comments with
    // the same millisecond don't drop one across page boundaries.
    const nextCursor = nextCursorFromPage(comments, limit);
    const sanitized: CommentWithRepliesView[] = comments.map((c) => ({
      ...stripDeletedAt(c),
      replies: c.replies.map((r) => stripDeletedAt(r)),
    }));
    return { items: sanitized, nextCursor, hasNext: nextCursor !== null };
  }
}
