/**
 * Feed-shaped post: the persisted Post + viewer-relative flags + thread
 * context. Used by the timeline endpoint.
 */

import type { PostWithRelations } from './post.entity';

export interface FeedItem extends PostWithRelations {
  readonly isLiked: boolean;
  readonly isBookmarked: boolean;
  readonly isReposted: boolean;
  readonly hasVoted: boolean;
  readonly myVoteIndex: number | null;
  readonly threadPosts: PostWithRelations[];
}

export interface FeedTimelineResult {
  readonly items: FeedItem[];
  readonly nextCursor: string | null;
  readonly hasNext: boolean;
}

export interface BookmarkedFeedItem extends PostWithRelations {
  readonly bookmarkedAt: Date;
  readonly isLiked: boolean;
  readonly isBookmarked: boolean;
}

export interface BookmarksResult {
  readonly items: BookmarkedFeedItem[];
  readonly nextCursor: string | null;
  readonly hasNext: boolean;
}

export interface UserPostsResult {
  readonly items: PostWithRelations[];
  readonly nextCursor: string | null;
  readonly hasNext: boolean;
}

export interface CommentsResult<T> {
  readonly items: T[];
  readonly nextCursor: string | null;
  readonly hasNext: boolean;
}

export interface RepliesResult<T> {
  readonly items: T[];
  readonly nextCursor: string | null;
  readonly hasNext: boolean;
}

export interface ReactionsResult<T> {
  readonly items: T[];
  readonly nextCursor: string | null;
  readonly hasNext: boolean;
}
