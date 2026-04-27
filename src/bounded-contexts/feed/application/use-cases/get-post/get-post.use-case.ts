/**
 * Fetch a post by id with author + (optional) original post embedded.
 * Applies blind-mode masking before returning.
 */

import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import type { PostWithRelations } from '../../../domain/entities';
import { FeedRepositoryPort } from '../../../domain/ports/feed.repository.port';
import { AnonymousMaskService } from '../../services/anonymous-mask.service';

export class GetPostUseCase {
  constructor(
    private readonly repository: FeedRepositoryPort,
    private readonly mask: AnonymousMaskService,
  ) {}

  async execute(id: string): Promise<PostWithRelations> {
    const post = await this.repository.findPostByIdWithRelations(id);
    if (!post || post.isDeleted) {
      throw new EntityNotFoundException('Post', id);
    }

    const masked = this.mask.mask(post);
    return masked.originalPost
      ? { ...masked, originalPost: this.mask.mask(masked.originalPost) }
      : masked;
  }
}
