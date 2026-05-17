/**
 * Pure orchestration for assembling the feed timeline:
 *   1. Resolve the viewer's follow + connection graph.
 *   2. Pull a candidate window of published posts (+ own scheduled ones).
 *   3. Sort with personal-network priority, then chronological.
 *   4. Decorate each post with viewer-relative flags (liked/bookmarked
 *      /reposted/voted) and gather thread context for threaded posts.
 *   5. Apply blind-mode masking for anonymous posts.
 */

import { CachePort } from '@/shared-kernel/cache/cache.port';
import { encodeCursor } from '@/shared-kernel/persistence/composite-cursor';
import type {
  FeedItem,
  FeedQuery,
  FeedTimelineResult,
  PostWithRelations,
} from '../../domain/entities';
import { FeedRepositoryPort } from '../../domain/ports/feed.repository.port';

/** P1-028 — short cache window. Long enough to absorb the bursty
 *  app-load fan-out (UI, native apps, web) but short enough that a
 *  new follow / new post propagates within seconds. */
const FEED_TIMELINE_CACHE_TTL = 15;

export class FeedTimelineService {
  constructor(
    private readonly repository: FeedRepositoryPort,
    private readonly cache?: CachePort,
  ) {}

  async getTimeline(query: FeedQuery): Promise<FeedTimelineResult> {
    if (!this.cache) {
      return this.computeTimeline(query);
    }
    // P1-028 — feed timeline is the hottest read on app load. Without
    // a cache every viewer triggers a full ranking + engagement +
    // thread fetch. We cache the assembled result per
    // (userId, cursor, type, followingOnly, limit) tuple for a short
    // window so refresh-driven storms collapse onto one DB pass per
    // unique view.
    const cacheKey = `feed:timeline:${query.userId}:${query.followingOnly ? 'follow' : 'all'}:${query.cursor ?? 'head'}:${query.limit}`;
    return this.cache.getOrSet(
      cacheKey,
      () => this.computeTimeline(query),
      FEED_TIMELINE_CACHE_TTL,
    );
  }

  private async computeTimeline(query: FeedQuery): Promise<FeedTimelineResult> {
    const { userId, cursor, limit, followingOnly } = query;

    const { followingIds, connectionIds } =
      await this.repository.listFollowedAndConnectionIds(userId);

    if (followingOnly && followingIds.length === 0) {
      return { items: [], nextCursor: null, hasNext: false };
    }

    const prioritizedUserIds = new Set([...followingIds, ...connectionIds, userId]);

    const candidates = await this.repository.listFeedPosts({
      cursor,
      take: followingOnly ? limit : limit * 3,
      followingOnly,
      followingIds,
      userId,
    });

    const isPrioritized = (post: PostWithRelations) => prioritizedUserIds.has(post.authorId);

    const sorted = [...candidates].sort((a, b) => {
      const aPrio = isPrioritized(a) ? 1 : 0;
      const bPrio = isPrioritized(b) ? 1 : 0;
      if (aPrio !== bPrio) return bPrio - aPrio;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
    const trimmed = sorted.slice(0, limit);

    if (trimmed.length === 0) {
      return { items: [], nextCursor: null, hasNext: false };
    }

    const postIds = trimmed.map((p) => p.id);
    const engagement = await this.repository.findViewerEngagement(postIds, userId);

    const threadIds = [
      ...new Set(trimmed.filter((p) => p.threadId).map((p) => p.threadId as string)),
    ];
    const threadMap =
      threadIds.length > 0 ? await this.repository.findThreadPosts(threadIds) : new Map();

    const enriched: FeedItem[] = trimmed.map((post) => {
      return {
        ...post,
        isLiked: engagement.likedPostIds.has(post.id),
        isBookmarked: engagement.bookmarkedPostIds.has(post.id),
        isReposted: engagement.repostedPostIds.has(post.id),
        hasVoted: engagement.voteByPostId.has(post.id),
        myVoteIndex: engagement.voteByPostId.get(post.id) ?? null,
        threadPosts: post.threadId ? (threadMap.get(post.threadId) ?? []) : [],
      };
    });

    // P1 #35 — composite (createdAt, id) so ties don't drop or
    // duplicate rows across pages.
    const last = enriched[enriched.length - 1];
    const nextCursor =
      enriched.length === limit && last ? encodeCursor(last.createdAt, last.id) : null;

    return { items: enriched, nextCursor, hasNext: nextCursor !== null };
  }
}
