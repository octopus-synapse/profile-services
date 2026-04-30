/**
 * Soft-delete a comment. Only the author may delete; decrements the
 * post's `commentsCount`.
 */

import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { CannotDeleteOthersCommentException } from '../../../domain/exceptions/feed.exceptions';
import { CommentRepositoryPort } from '../../../domain/ports/comment.repository.port';

export class DeleteCommentUseCase {
  constructor(private readonly repository: CommentRepositoryPort) {}

  async execute(id: string, userId: string): Promise<void> {
    const comment = await this.repository.findCommentById(id);
    if (!comment || comment.isDeleted) {
      throw new EntityNotFoundException('Comment', id);
    }
    if (comment.authorId !== userId) {
      throw new CannotDeleteOthersCommentException();
    }
    await this.repository.markCommentDeleted(id);
    await this.repository.incrementPostCommentsCount(comment.postId, -1);
  }
}
