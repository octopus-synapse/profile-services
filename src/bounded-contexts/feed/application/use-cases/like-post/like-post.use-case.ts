/**
 * Like a post. Notifies the post author the first time the viewer likes.
 *
 * Behaviour:
 *   - If the user already liked the post → idempotent no-op.
 *   - Otherwise → create the like row, bump `likesCount`, fire notify.
 *
 * Single reaction model: presence of a `PostLike` row = LIKE. The legacy
 * five-reaction picker (CELEBRATE/LOVE/INSIGHTFUL/CURIOUS) was retired
 * along with the post-type taxonomy in the minimalist feed refactor.
 */

import { LoggerPort } from '@/shared-kernel';
import { PostNotFoundException } from '../../../domain/exceptions/feed.exceptions';
import { EngagementRepositoryPort } from '../../../domain/ports/engagement.repository.port';
import { EngagementNotifierPort } from '../../../domain/ports/engagement-notifier.port';

export interface LikePostResult {
  readonly postId: string;
  readonly userId: string;
  readonly postAuthorId?: string;
  readonly alreadyLiked: boolean;
}

export class LikePostUseCase {
  constructor(
    private readonly repository: EngagementRepositoryPort,
    private readonly notifier: EngagementNotifierPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(postId: string, userId: string): Promise<LikePostResult> {
    const post = await this.repository.findPostById(postId);
    if (!post || post.isDeleted) {
      throw new PostNotFoundException(postId);
    }

    const existing = await this.repository.findLike(postId, userId);
    if (existing) {
      return { postId, userId, alreadyLiked: true };
    }

    await this.repository.createLike(postId, userId);
    await this.repository.incrementLikesCount(postId, 1);

    await this.notifier.notify({
      recipientId: post.authorId,
      actorId: userId,
      postId,
      type: 'POST_LIKED',
      message: 'liked your post',
    });

    return { postId, userId, postAuthorId: post.authorId, alreadyLiked: false };
  }
}
