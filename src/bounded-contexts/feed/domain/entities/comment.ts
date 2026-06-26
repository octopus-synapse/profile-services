/**
 * Domain shapes for post comments.
 */

import type { PostAuthor } from './post.entity';

export interface Comment {
  readonly id: string;
  readonly postId: string;
  readonly authorId: string;
  readonly content: string;
  readonly parentId: string | null;
  readonly isDeleted: boolean;
  /** P1-067 — soft-delete timestamp; null on never-deleted rows. */
  readonly deletedAt: Date | null;
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
    readonly content: string | null;
    readonly authorId: string;
    readonly author: PostAuthor;
  };
}
