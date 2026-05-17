/**
 * Outbound port for feed/post persistence.
 *
 * Aggregates every Prisma read/write the feed slice needs: post CRUD,
 * timeline / bookmark queries, viewer-relative decoration helpers, and
 * thread/poll context lookups.
 */

import type {
  BookmarkedFeedItem,
  PersistPostInput,
  Post,
  PostWithAuthor,
  PostWithRelations,
  UserPostsResult,
} from '../entities';

export abstract class FeedRepositoryPort {
  // -------- Post CRUD --------
  abstract createPost(authorId: string, input: PersistPostInput): Promise<PostWithAuthor>;
  abstract findPostById(id: string): Promise<Post | null>;
  abstract findPostByIdWithRelations(id: string): Promise<PostWithRelations | null>;
  abstract markPostDeleted(id: string): Promise<Post>;
  abstract incrementRepostCount(originalPostId: string, by: number): Promise<void>;

  /**
   * Idempotent soft-delete that, when the post is a repost, decrements
   * `originalPost.repostsCount` in the same transaction. Returns
   * `mutated: true` iff this call was the one that flipped the row,
   * so the caller can publish exactly one DomainEvent.
   */
  abstract softDeletePostInTx(
    id: string,
  ): Promise<{ mutated: boolean; originalPostId: string | null }>;

  // -------- Timeline / listings --------
  abstract listFollowedAndConnectionIds(
    userId: string,
  ): Promise<{ followingIds: string[]; connectionIds: string[] }>;
  abstract listFeedPosts(params: {
    cursor?: string;
    take: number;
    followingOnly: boolean;
    followingIds: string[];
    userId: string;
  }): Promise<PostWithRelations[]>;
  abstract listUserPosts(
    userId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<UserPostsResult>;
  abstract listBookmarks(
    userId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<{ posts: BookmarkedFeedItem[]; nextCursor: string | null }>;

  // -------- Viewer-relative decoration --------
  abstract findViewerEngagement(
    postIds: string[],
    userId: string,
  ): Promise<{
    likedPostIds: Set<string>;
    bookmarkedPostIds: Set<string>;
    repostedPostIds: Set<string>;
    voteByPostId: Map<string, number>;
  }>;
  abstract findThreadPosts(threadIds: string[]): Promise<Map<string, PostWithRelations[]>>;
  abstract findLikedPostIds(postIds: string[], userId: string): Promise<Set<string>>;
}
