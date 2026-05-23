/**
 * Outbound port for comment persistence (and the implicit
 * `Post.commentsCount` denormalisation).
 */

import type { Comment, CommentWithAuthor, CommentWithPost, CommentWithReplies } from '../entities';

export abstract class CommentRepositoryPort {
  abstract findPostById(postId: string): Promise<{ id: string; isDeleted: boolean } | null>;
  abstract findCommentById(id: string): Promise<Comment | null>;
  abstract createComment(input: {
    postId: string;
    authorId: string;
    content: string;
    parentId?: string;
  }): Promise<CommentWithAuthor>;
  abstract markCommentDeleted(id: string): Promise<Comment>;
  abstract incrementPostCommentsCount(postId: string, by: number): Promise<void>;

  /**
   * Idempotent soft-delete: flips `isDeleted` to `true` and returns
   * whether this call was the one that actually mutated the row. A
   * second concurrent invocation gets `mutated: false` so the caller
   * doesn't double-decrement `Post.commentsCount`.
   */
  abstract softDeleteCommentIfActive(
    id: string,
  ): Promise<{ mutated: boolean; postId: string | null }>;

  abstract listTopLevelByPost(
    postId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<CommentWithReplies[]>;
  abstract listRepliesByComment(
    commentId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<CommentWithAuthor[]>;
  abstract listByAuthor(
    userId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<CommentWithPost[]>;
}
