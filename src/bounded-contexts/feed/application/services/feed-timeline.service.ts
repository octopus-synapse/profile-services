/**
 * Pure orchestration for assembling the feed timeline:
 *   1. Resolve the viewer's follow + connection graph.
 *   2. Pull a candidate window of published posts (+ own scheduled ones).
 *   3. Sort with personal-network priority, then chronological.
 *   4. Decorate each post with viewer-relative flags (liked/bookmarked
 *      /reposted/voted) and gather thread context for threaded posts.
 *   5. Apply blind-mode masking for anonymous posts.
 */

import type {
  FeedItem,
  FeedQuery,
  FeedTimelineResult,
  PostWithRelations,
} from '../../domain/entities';
import { FeedRepositoryPort } from '../../domain/ports/feed.repository.port';
import { AnonymousMaskService } from './anonymous-mask.service';

export class FeedTimelineService {
  constructor(
    private readonly repository: FeedRepositoryPort,
    private readonly mask: AnonymousMaskService,
  ) {}

  async getTimeline(query: FeedQuery): Promise<FeedTimelineResult> {
    const { userId, cursor, limit, type, followingOnly } = query;

    const { followingIds, connectionIds } =
      await this.repository.listFollowedAndConnectionIds(userId);

    if (followingOnly && followingIds.length === 0) {
      return { posts: [], nextCursor: null };
    }

    const prioritizedUserIds = new Set([...followingIds, ...connectionIds, userId]);

    const candidates = await this.repository.listFeedPosts({
      cursor,
      take: followingOnly ? limit : limit * 3,
      type,
      followingOnly,
      followingIds,
      userId,
    });

    const isPrioritized = (post: PostWithRelations) =>
      prioritizedUserIds.has(post.authorId) || post.coAuthors.includes(userId);

    const sorted = [...candidates].sort((a, b) => {
      const aPrio = isPrioritized(a) ? 1 : 0;
      const bPrio = isPrioritized(b) ? 1 : 0;
      if (aPrio !== bPrio) return bPrio - aPrio;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
    const trimmed = sorted.slice(0, limit);

    if (trimmed.length === 0) {
      return { posts: [], nextCursor: null };
    }

    const postIds = trimmed.map((p) => p.id);
    const engagement = await this.repository.findViewerEngagement(postIds, userId);

    const threadIds = [
      ...new Set(trimmed.filter((p) => p.threadId).map((p) => p.threadId as string)),
    ];
    const threadMap =
      threadIds.length > 0 ? await this.repository.findThreadPosts(threadIds) : new Map();

    const enriched: FeedItem[] = trimmed.map((post) => {
      const masked = this.mask.mask(post);
      const maskedWithOriginal: PostWithRelations = masked.originalPost
        ? { ...masked, originalPost: this.mask.mask(masked.originalPost) }
        : masked;

      return {
        ...maskedWithOriginal,
        isLiked: engagement.likedPostMap.has(post.id),
        reactionType: engagement.likedPostMap.get(post.id) ?? null,
        isBookmarked: engagement.bookmarkedPostIds.has(post.id),
        isReposted: engagement.repostedPostIds.has(post.id),
        hasVoted: engagement.voteByPostId.has(post.id),
        myVoteIndex: engagement.voteByPostId.get(post.id) ?? null,
        threadPosts: post.threadId ? (threadMap.get(post.threadId) ?? []) : [],
      };
    });

    const nextCursor =
      enriched.length === limit ? enriched[enriched.length - 1].createdAt.toISOString() : null;

    return { posts: enriched, nextCursor };
  }
}
