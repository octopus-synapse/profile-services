/**
 * Fetch a post by id with author + (optional) original post embedded.
 *
 * Historical note: pre-Fase 5 refactor this applied Blind Mode masking
 * (AnonymousMaskService). Blind Mode was dropped in the feed minimalist
 * refactor — posts are no longer anonymous-able, so masking is a no-op
 * and the dependency was removed.
 */

import { LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import type { PostWithRelations } from '../../../domain/entities';
import { FeedRepositoryPort } from '../../../domain/ports/feed.repository.port';

export class GetPostUseCase {
  constructor(
    private readonly repository: FeedRepositoryPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(id: string): Promise<PostWithRelations> {
    const post = await this.repository.findPostByIdWithRelations(id);
    if (!post || post.isDeleted) {
      throw new EntityNotFoundException('Post', id);
    }
    return post;
  }
}
