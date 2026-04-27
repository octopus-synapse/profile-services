/**
 * Outbound port for like / bookmark / repost persistence and the
 * matching denormalised counters on `Post`.
 */

import type {
  Post,
  PostBookmark,
  PostLike,
  PostWithAuthor,
  ReactionType,
  ReactionWithPost,
} from '../entities';

export abstract class EngagementRepositoryPort {
  abstract findPostById(id: string): Promise<Post | null>;

  // -------- Likes / reactions --------
  abstract findLike(postId: string, userId: string): Promise<PostLike | null>;
  abstract createLike(postId: string, userId: string, reactionType: ReactionType): Promise<void>;
  abstract updateLikeReaction(
    postId: string,
    userId: string,
    reactionType: ReactionType,
  ): Promise<void>;
  abstract deleteLike(postId: string, userId: string): Promise<void>;
  abstract incrementLikesCount(postId: string, by: number): Promise<void>;
  abstract listReactionsByUser(
    userId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<ReactionWithPost[]>;

  // -------- Bookmarks --------
  abstract findBookmark(postId: string, userId: string): Promise<PostBookmark | null>;
  abstract createBookmark(postId: string, userId: string): Promise<void>;
  abstract deleteBookmark(postId: string, userId: string): Promise<void>;
  abstract incrementBookmarksCount(postId: string, by: number): Promise<void>;

  // -------- Reposts --------
  abstract findExistingRepost(
    originalPostId: string,
    authorId: string,
  ): Promise<{ id: string } | null>;
  abstract createRepost(input: {
    authorId: string;
    originalPostId: string;
    content: string;
    hashtags: string[];
  }): Promise<PostWithAuthor>;
  abstract incrementRepostsCount(postId: string, by: number): Promise<void>;
}
