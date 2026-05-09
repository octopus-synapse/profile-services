/**
 * In-memory `FeedRepositoryPort` for use-case specs. Aims to honor the
 * same contract as the Prisma adapter (active-only, cursor by createdAt
 * desc, follow/connection priority shape) without spinning up a DB.
 */

import { randomUUID } from 'node:crypto';
import type {
  BookmarkedFeedItem,
  PersistPostInput,
  Post,
  PostAuthor,
  PostType,
  PostWithAuthor,
  PostWithRelations,
  ReactionType,
  UserPostsResult,
} from '../domain/entities';
import { FeedRepositoryPort } from '../domain/ports/feed.repository.port';

interface BookmarkRow {
  id: string;
  postId: string;
  userId: string;
  createdAt: Date;
}

interface LikeRow {
  postId: string;
  userId: string;
  reactionType: ReactionType;
}

interface VoteRow {
  postId: string;
  userId: string;
  optionIndex: number;
}

const DEFAULT_AUTHOR: PostAuthor = {
  id: 'unknown',
  name: null,
  username: null,
  photoURL: null,
  bio: null,
  location: null,
};

function makePost(partial: Partial<Post> & { id?: string; authorId: string }): Post {
  const now = new Date();
  return {
    id: partial.id ?? randomUUID(),
    authorId: partial.authorId,
    type: (partial.type ?? 'TEXT') as PostType,
    subtype: partial.subtype ?? null,
    content: partial.content ?? null,
    hardSkills: partial.hardSkills ?? [],
    softSkills: partial.softSkills ?? [],
    hashtags: partial.hashtags ?? [],
    data: partial.data ?? null,
    imageUrl: partial.imageUrl ?? null,
    linkUrl: partial.linkUrl ?? null,
    linkPreview: partial.linkPreview ?? null,
    originalPostId: partial.originalPostId ?? null,
    coAuthors: partial.coAuthors ?? [],
    scheduledAt: partial.scheduledAt ?? null,
    isPublished: partial.isPublished ?? true,
    threadId: partial.threadId ?? null,
    pollDeadline: partial.pollDeadline ?? null,
    votesCount: partial.votesCount ?? 0,
    codeSnippet: partial.codeSnippet ?? null,
    likesCount: partial.likesCount ?? 0,
    commentsCount: partial.commentsCount ?? 0,
    repostsCount: partial.repostsCount ?? 0,
    bookmarksCount: partial.bookmarksCount ?? 0,
    isDeleted: partial.isDeleted ?? false,
    deletedAt: partial.deletedAt ?? null,
    isAnonymous: partial.isAnonymous ?? false,
    anonymousCategory: partial.anonymousCategory ?? null,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  };
}

export class InMemoryFeedRepository extends FeedRepositoryPort {
  readonly posts = new Map<string, Post>();
  readonly authors = new Map<string, PostAuthor>();
  readonly follows: { followerId: string; followingId: string }[] = [];
  readonly connections: { requesterId: string; targetId: string; status: string }[] = [];
  readonly likes: LikeRow[] = [];
  readonly bookmarks: BookmarkRow[] = [];
  readonly votes: VoteRow[] = [];

  // ---------- seed helpers ----------
  seedPost(partial: Partial<Post> & { authorId: string }): Post {
    const post = makePost(partial);
    this.posts.set(post.id, post);
    if (!this.authors.has(post.authorId)) {
      this.authors.set(post.authorId, { ...DEFAULT_AUTHOR, id: post.authorId });
    }
    return post;
  }

  seedAuthor(author: Partial<PostAuthor> & { id: string }): PostAuthor {
    const full: PostAuthor = { ...DEFAULT_AUTHOR, ...author };
    this.authors.set(full.id, full);
    return full;
  }

  seedFollow(followerId: string, followingId: string): void {
    this.follows.push({ followerId, followingId });
  }

  seedConnection(requesterId: string, targetId: string, status = 'ACCEPTED'): void {
    this.connections.push({ requesterId, targetId, status });
  }

  seedLike(postId: string, userId: string, reactionType: ReactionType): void {
    this.likes.push({ postId, userId, reactionType });
  }

  seedBookmark(postId: string, userId: string, createdAt = new Date()): void {
    this.bookmarks.push({ id: randomUUID(), postId, userId, createdAt });
  }

  seedVote(postId: string, userId: string, optionIndex: number): void {
    this.votes.push({ postId, userId, optionIndex });
  }

  private authorOf(id: string): PostAuthor {
    return this.authors.get(id) ?? { ...DEFAULT_AUTHOR, id };
  }

  private withAuthor(post: Post): PostWithAuthor {
    return { ...post, author: this.authorOf(post.authorId) };
  }

  private withRelations(post: Post): PostWithRelations {
    const original = post.originalPostId ? this.posts.get(post.originalPostId) : null;
    return {
      ...this.withAuthor(post),
      originalPost: original ? this.withAuthor(original) : null,
    };
  }

  // ---------- port implementation ----------
  async createPost(authorId: string, input: PersistPostInput): Promise<PostWithAuthor> {
    const post = makePost({
      authorId,
      type: input.type,
      subtype: input.subtype ?? null,
      content: input.content ?? null,
      hardSkills: input.hardSkills ?? [],
      softSkills: input.softSkills ?? [],
      hashtags: input.hashtags,
      data: input.data ?? null,
      imageUrl: input.imageUrl ?? null,
      linkUrl: input.linkUrl ?? null,
      linkPreview: input.linkPreview ?? null,
      originalPostId: input.originalPostId ?? null,
      coAuthors: input.coAuthors ?? [],
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      isPublished: input.isPublished,
      threadId: input.threadId ?? null,
      codeSnippet: input.codeSnippet ?? null,
      isAnonymous: input.isAnonymous === true,
      anonymousCategory: input.isAnonymous ? (input.anonymousCategory ?? null) : null,
    });
    this.posts.set(post.id, post);
    if (!this.authors.has(authorId)) {
      this.authors.set(authorId, { ...DEFAULT_AUTHOR, id: authorId });
    }
    return this.withAuthor(post);
  }

  async findPostById(id: string): Promise<Post | null> {
    return this.posts.get(id) ?? null;
  }

  async findPostByIdWithRelations(id: string): Promise<PostWithRelations | null> {
    const post = this.posts.get(id);
    return post ? this.withRelations(post) : null;
  }

  async markPostDeleted(id: string): Promise<Post> {
    const current = this.posts.get(id);
    if (!current) throw new Error(`Post ${id} not found`);
    const next: Post = { ...current, isDeleted: true, deletedAt: new Date() };
    this.posts.set(id, next);
    return next;
  }

  async incrementRepostCount(originalPostId: string, by: number): Promise<void> {
    const current = this.posts.get(originalPostId);
    if (!current) return;
    this.posts.set(originalPostId, { ...current, repostsCount: current.repostsCount + by });
  }

  async listFollowedAndConnectionIds(
    userId: string,
  ): Promise<{ followingIds: string[]; connectionIds: string[] }> {
    const followingIds = this.follows
      .filter((f) => f.followerId === userId)
      .map((f) => f.followingId);
    const connectionIds = this.connections
      .filter((c) => c.status === 'ACCEPTED' && (c.requesterId === userId || c.targetId === userId))
      .map((c) => (c.requesterId === userId ? c.targetId : c.requesterId));
    return { followingIds, connectionIds };
  }

  async listFeedPosts(params: {
    cursor?: string;
    take: number;
    type?: PostType;
    followingOnly: boolean;
    followingIds: string[];
    userId: string;
  }): Promise<PostWithRelations[]> {
    const { cursor, take, type, followingOnly, followingIds, userId } = params;
    const cursorDate = cursor ? new Date(cursor) : null;

    const rows = [...this.posts.values()].filter((p) => {
      if (p.isDeleted) return false;
      if (type && p.type !== type) return false;
      if (cursorDate && p.createdAt >= cursorDate) return false;
      if (followingOnly) {
        return followingIds.includes(p.authorId) && p.isPublished;
      }
      return p.isPublished || (p.authorId === userId && !p.isPublished);
    });

    rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return rows.slice(0, take).map((p) => this.withRelations(p));
  }

  async listUserPosts(
    userId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<UserPostsResult> {
    const cursorDate = cursor ? new Date(cursor) : null;
    const rows = [...this.posts.values()]
      .filter(
        (p) =>
          p.authorId === userId && !p.isDeleted && (cursorDate ? p.createdAt < cursorDate : true),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
    const posts = rows.map((p) => this.withRelations(p));
    const nextCursor =
      posts.length === limit ? posts[posts.length - 1].createdAt.toISOString() : null;
    return { items: posts, nextCursor, hasNext: nextCursor !== null };
  }

  async listBookmarks(
    userId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<{ posts: BookmarkedFeedItem[]; nextCursor: string | null }> {
    const cursorDate = cursor ? new Date(cursor) : null;
    const rows = this.bookmarks
      .filter((b) => b.userId === userId && (cursorDate ? b.createdAt < cursorDate : true))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    const posts: BookmarkedFeedItem[] = [];
    for (const b of rows) {
      const post = this.posts.get(b.postId);
      if (!post || post.isDeleted) continue;
      posts.push({
        ...this.withRelations(post),
        bookmarkedAt: b.createdAt,
        isLiked: false,
        isBookmarked: true,
      });
    }

    const nextCursor = rows.length === limit ? rows[rows.length - 1].createdAt.toISOString() : null;
    return { posts, nextCursor };
  }

  async findViewerEngagement(
    postIds: string[],
    userId: string,
  ): Promise<{
    likedPostMap: Map<string, ReactionType>;
    bookmarkedPostIds: Set<string>;
    repostedPostIds: Set<string>;
    voteByPostId: Map<string, number>;
  }> {
    const ids = new Set(postIds);
    const likedPostMap = new Map<string, ReactionType>();
    for (const l of this.likes) {
      if (l.userId === userId && ids.has(l.postId)) likedPostMap.set(l.postId, l.reactionType);
    }
    const bookmarkedPostIds = new Set(
      this.bookmarks.filter((b) => b.userId === userId && ids.has(b.postId)).map((b) => b.postId),
    );
    const repostedPostIds = new Set<string>();
    for (const p of this.posts.values()) {
      if (
        p.authorId === userId &&
        p.type === 'REPOST' &&
        p.originalPostId &&
        ids.has(p.originalPostId) &&
        !p.isDeleted
      ) {
        repostedPostIds.add(p.originalPostId);
      }
    }
    const voteByPostId = new Map<string, number>();
    for (const v of this.votes) {
      if (v.userId === userId && ids.has(v.postId)) voteByPostId.set(v.postId, v.optionIndex);
    }
    return { likedPostMap, bookmarkedPostIds, repostedPostIds, voteByPostId };
  }

  async findThreadPosts(threadIds: string[]): Promise<Map<string, PostWithRelations[]>> {
    const map = new Map<string, PostWithRelations[]>();
    for (const id of threadIds) map.set(id, []);
    const rows = [...this.posts.values()]
      .filter((p) => p.threadId && threadIds.includes(p.threadId) && !p.isDeleted && p.isPublished)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    for (const p of rows) {
      if (!p.threadId) continue;
      const existing = map.get(p.threadId) ?? [];
      existing.push(this.withRelations(p));
      map.set(p.threadId, existing);
    }
    return map;
  }

  async findLikedPostIds(postIds: string[], userId: string): Promise<Set<string>> {
    const set = new Set(postIds);
    return new Set(
      this.likes.filter((l) => l.userId === userId && set.has(l.postId)).map((l) => l.postId),
    );
  }
}
