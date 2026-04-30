/**
 * Like (or change reaction on) a post. Notifies the post author the
 * first time the viewer reacts.
 *
 * Behaviour:
 *   - If the user already reacted with the same type → idempotent no-op.
 *   - If they reacted with a different type → swap the reaction.
 *   - Otherwise → create the reaction, bump `likesCount`, fire notify.
 */

import { LoggerPort } from '@/shared-kernel';
import type { ReactionType } from '../../../domain/entities';
import { PostNotFoundException } from '../../../domain/exceptions/feed.exceptions';
import { EngagementRepositoryPort } from '../../../domain/ports/engagement.repository.port';
import { EngagementNotifierPort } from '../../../domain/ports/engagement-notifier.port';

export interface LikePostResult {
  readonly postId: string;
  readonly userId: string;
  readonly reactionType: ReactionType;
  readonly postAuthorId?: string;
  readonly alreadyLiked: boolean;
  readonly updated?: boolean;
}

export class LikePostUseCase {
  constructor(
    private readonly repository: EngagementRepositoryPort,
    private readonly notifier: EngagementNotifierPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(
    postId: string,
    userId: string,
    reactionType: ReactionType = 'LIKE',
  ): Promise<LikePostResult> {
    const post = await this.repository.findPostById(postId);
    if (!post || post.isDeleted) {
      throw new PostNotFoundException(postId);
    }

    const existing = await this.repository.findLike(postId, userId);
    if (existing) {
      if (existing.reactionType === reactionType) {
        return { postId, userId, reactionType, alreadyLiked: true };
      }
      await this.repository.updateLikeReaction(postId, userId, reactionType);
      return {
        postId,
        userId,
        reactionType,
        postAuthorId: post.authorId,
        alreadyLiked: false,
        updated: true,
      };
    }

    await this.repository.createLike(postId, userId, reactionType);
    await this.repository.incrementLikesCount(postId, 1);

    await this.notifier.notify({
      recipientId: post.authorId,
      actorId: userId,
      postId,
      type: 'POST_LIKED',
      message: 'reacted to your post',
    });

    return { postId, userId, reactionType, postAuthorId: post.authorId, alreadyLiked: false };
  }
}
