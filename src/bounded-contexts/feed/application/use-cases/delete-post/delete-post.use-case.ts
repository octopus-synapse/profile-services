/**
 * Soft-delete a post. Only the author may delete their own posts.
 *
 * P1 #31 — when the post being deleted is itself a repost, the
 * `Post.repostsCount` of the original must drop by 1 in the same
 * transaction. The previous implementation only flipped `isDeleted`
 * on the repost, leaving the original's counter inflated.
 */

import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { CannotDeleteOthersPostException } from '../../../domain/exceptions/feed.exceptions';
import { FeedRepositoryPort } from '../../../domain/ports/feed.repository.port';

export class DeletePostUseCase {
  constructor(private readonly repository: FeedRepositoryPort) {}

  async execute(id: string, userId: string): Promise<void> {
    const post = await this.repository.findPostById(id);
    if (!post) {
      throw new EntityNotFoundException('Post', id);
    }
    if (post.authorId !== userId) {
      throw new CannotDeleteOthersPostException();
    }
    if (post.isDeleted) {
      return;
    }
    await this.repository.softDeletePostInTx(id);
  }
}
