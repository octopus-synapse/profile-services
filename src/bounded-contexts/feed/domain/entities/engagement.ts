/**
 * Domain shapes for post engagement (likes, bookmarks, reports, votes).
 */

import type { PostAuthor } from './post.entity';

export interface PostLike {
  readonly id: string;
  readonly postId: string;
  readonly userId: string;
  readonly createdAt: Date;
}

export interface PostBookmark {
  readonly id: string;
  readonly postId: string;
  readonly userId: string;
  readonly createdAt: Date;
}

export interface PostReport {
  readonly id: string;
  readonly postId: string;
  readonly userId: string;
  readonly reason: string;
  readonly status: string;
  readonly createdAt: Date;
}

export interface PollVote {
  readonly id: string;
  readonly postId: string;
  readonly userId: string;
  readonly optionIndex: number;
  readonly createdAt: Date;
}

/** Like + denormalised post snippet for activity feeds. */
export interface LikeWithPost {
  readonly postId: string;
  readonly userId: string;
  readonly createdAt: Date;
  readonly post: {
    readonly id: string;
    readonly content: string | null;
    readonly authorId: string;
    readonly author: PostAuthor;
  };
}

export interface PollResultBucket {
  readonly optionIndex: number;
  readonly count: number;
}
