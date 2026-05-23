/**
 * Soft-delete a comment. Only the author may delete; decrements the
 * post's `commentsCount` exactly once even when concurrent callers
 * try to delete the same comment.
 *
 * P1 #30 — the previous implementation issued a plain `update` plus a
 * separate `increment(-1)`. Two concurrent requests for the same id
 * would both reach the increment and over-decrement the counter. The
 * port now exposes an idempotent flip whose rowcount tells us whether
 * this call was the one that actually mutated the row.
 */

import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { CannotDeleteOthersCommentException } from '../../../domain/exceptions/feed.exceptions';
import { CommentRepositoryPort } from '../../../domain/ports/comment.repository.port';

export class DeleteCommentUseCase {
  constructor(private readonly repository: CommentRepositoryPort) {}

  async execute(id: string, userId: string): Promise<void> {
    const comment = await this.repository.findCommentById(id);
    if (!comment) {
      throw new EntityNotFoundException('Comment', id);
    }
    if (comment.authorId !== userId) {
      throw new CannotDeleteOthersCommentException();
    }
    if (comment.isDeleted) {
      return;
    }
    const result = await this.repository.softDeleteCommentIfActive(id);
    if (result.mutated && result.postId) {
      await this.repository.incrementPostCommentsCount(result.postId, -1);
    }
  }
}
