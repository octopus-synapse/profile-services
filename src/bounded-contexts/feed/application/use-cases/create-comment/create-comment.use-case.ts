/**
 * Create a comment (or reply) on a post. Verifies the post exists and,
 * when replying, that the parent comment exists. Increments
 * `commentsCount` on the post.
 */

import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import type { CommentWithAuthor } from '../../../domain/entities';
import { CommentRepositoryPort } from '../../../domain/ports/comment.repository.port';

export class CreateCommentUseCase {
  constructor(private readonly repository: CommentRepositoryPort) {}

  async execute(
    postId: string,
    authorId: string,
    content: string,
    parentId?: string,
  ): Promise<CommentWithAuthor> {
    const post = await this.repository.findPostById(postId);
    if (!post || post.isDeleted) {
      throw new EntityNotFoundException('Post', postId);
    }

    if (parentId) {
      const parent = await this.repository.findCommentById(parentId);
      if (!parent || parent.isDeleted) {
        throw new EntityNotFoundException('Comment', parentId);
      }
    }

    const comment = await this.repository.createComment({ postId, authorId, content, parentId });
    await this.repository.incrementPostCommentsCount(postId, 1);
    return comment;
  }
}
