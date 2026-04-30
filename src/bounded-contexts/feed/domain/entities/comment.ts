/**
 * Domain shapes for post comments.
 */

import type { PostAuthor } from './post';

export interface Comment {
  readonly id: string;
  readonly postId: string;
  readonly authorId: string;
  readonly content: string;
  readonly parentId: string | null;
  readonly isDeleted: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CommentWithAuthor extends Comment {
  readonly author: PostAuthor;
}

export interface CommentWithReplies extends CommentWithAuthor {
  readonly replies: CommentWithAuthor[];
}

/** Comment + minimal post reference for activity feeds. */
export interface CommentWithPost extends CommentWithAuthor {
  readonly post: {
    readonly id: string;
    readonly type: string;
    readonly content: string | null;
    readonly authorId: string;
    readonly author: PostAuthor;
  };
}
