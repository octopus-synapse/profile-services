/**
 * Create a new post. Parses hashtags from content, decides whether the
 * post is published immediately or scheduled, fetches an Open-Graph
 * preview if `linkUrl` is set, and bumps `repostsCount` on the original
 * when this is a REPOST.
 */

import { LoggerPort } from '@/shared-kernel';
import type { CreatePostInput, PostWithAuthor } from '../../../domain/entities';
import { FeedRepositoryPort } from '../../../domain/ports/feed.repository.port';
import { LinkPreviewFetcherPort } from '../../../domain/ports/link-preview-fetcher.port';
import { HashtagParserService } from '../../services/hashtag-parser.service';

export class CreatePostUseCase {
  constructor(
    private readonly repository: FeedRepositoryPort,
    private readonly linkPreview: LinkPreviewFetcherPort,
    private readonly hashtags: HashtagParserService,
    private readonly logger: LoggerPort,
  ) {}

  async execute(authorId: string, input: CreatePostInput): Promise<PostWithAuthor> {
    let linkPreview = input.linkPreview;
    if (input.linkUrl && !linkPreview) {
      const fetched = await this.linkPreview.fetchPreview(input.linkUrl);
      if (fetched) linkPreview = fetched;
    }

    const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : undefined;
    const isPublished = !(scheduledAt && scheduledAt > new Date());

    const post = await this.repository.createPost(authorId, {
      ...input,
      hashtags: this.hashtags.parse(input.content ?? null),
      linkPreview,
      isPublished,
    });

    if (input.isRepost && input.originalPostId) {
      await this.repository.incrementRepostCount(input.originalPostId, 1);
    }

    return post;
  }
}
