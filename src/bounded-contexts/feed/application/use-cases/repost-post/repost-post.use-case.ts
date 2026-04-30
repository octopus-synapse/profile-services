/**
 * Repost a post. With commentary → creates a new REPOST post (parses
 * hashtags). Without → only bumps the counter. Either way, notifies the
 * original author. Prevents duplicate reposts by the same user.
 */

import { LoggerPort } from '@/shared-kernel';
import {
  PostAlreadyRepostedException,
  PostNotFoundException,
} from '../../../domain/exceptions/feed.exceptions';
import { EngagementRepositoryPort } from '../../../domain/ports/engagement.repository.port';
import { EngagementNotifierPort } from '../../../domain/ports/engagement-notifier.port';
import { HashtagParserService } from '../../services/hashtag-parser.service';

export class RepostPostUseCase {
  constructor(
    private readonly repository: EngagementRepositoryPort,
    private readonly notifier: EngagementNotifierPort,
    private readonly hashtags: HashtagParserService,
    private readonly logger: LoggerPort,
  ) {}

  async execute(postId: string, userId: string, commentary?: string) {
    const post = await this.repository.findPostById(postId);
    if (!post || post.isDeleted) {
      throw new PostNotFoundException(postId);
    }

    const existing = await this.repository.findExistingRepost(postId, userId);
    if (existing) {
      throw new PostAlreadyRepostedException();
    }

    if (commentary) {
      const repost = await this.repository.createRepost({
        authorId: userId,
        originalPostId: postId,
        content: commentary,
        hashtags: this.hashtags.parse(commentary),
      });
      await this.repository.incrementRepostsCount(postId, 1);
      await this.notifier.notify({
        recipientId: post.authorId,
        actorId: userId,
        postId,
        type: 'POST_REPOSTED',
        message: 'reposted your post',
      });
      return repost;
    }

    await this.repository.incrementRepostsCount(postId, 1);
    await this.notifier.notify({
      recipientId: post.authorId,
      actorId: userId,
      postId,
      type: 'POST_REPOSTED',
      message: 'reposted your post',
    });
    return { postId, userId, reposted: true };
  }
}
