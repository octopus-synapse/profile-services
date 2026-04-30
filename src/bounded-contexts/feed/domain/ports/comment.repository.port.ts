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
