/**
 * Feed-shaped post: the persisted Post + viewer-relative flags + thread
 * context. Used by the timeline endpoint.
 */

import type { PostWithRelations, ReactionType } from './post';

export interface FeedItem extends PostWithRelations {
  readonly isLiked: boolean;
  readonly reactionType: ReactionType | null;
  readonly isBookmarked: boolean;
  readonly isReposted: boolean;
  readonly hasVoted: boolean;
  readonly myVoteIndex: number | null;
  readonly threadPosts: PostWithRelations[];
}

export interface FeedTimelineResult {
  readonly posts: FeedItem[];
  readonly nextCursor: string | null;
}

export interface BookmarkedFeedItem extends PostWithRelations {
  readonly bookmarkedAt: Date;
  readonly isLiked: boolean;
  readonly isBookmarked: boolean;
}

export interface BookmarksResult {
  readonly posts: BookmarkedFeedItem[];
  readonly nextCursor: string | null;
}

export interface UserPostsResult {
  readonly posts: PostWithRelations[];
  readonly nextCursor: string | null;
}

export interface CommentsResult<T> {
  readonly comments: T[];
  readonly nextCursor: string | null;
}

export interface RepliesResult<T> {
  readonly replies: T[];
  readonly nextCursor: string | null;
}

export interface ReactionsResult<T> {
  readonly reactions: T[];
  readonly nextCursor: string | null;
}
