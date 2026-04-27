/**
 * Soft-delete a post. Only the author may delete their own posts.
 */

import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { CannotDeleteOthersPostException } from '../../../domain/exceptions/feed.exceptions';
import { FeedRepositoryPort } from '../../../domain/ports/feed.repository.port';

export class DeletePostUseCase {
  constructor(private readonly repository: FeedRepositoryPort) {}

  async execute(id: string, userId: string): Promise<void> {
    const post = await this.repository.findPostById(id);
    if (!post || post.isDeleted) {
      throw new EntityNotFoundException('Post', id);
    }
    if (post.authorId !== userId) {
      throw new CannotDeleteOthersPostException();
    }
    await this.repository.markPostDeleted(id);
  }
}
