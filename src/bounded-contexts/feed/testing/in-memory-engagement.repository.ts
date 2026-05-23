/**
 * In-memory `EngagementRepositoryPort` for use-case specs.
 */

import { randomUUID } from 'node:crypto';
import type {
  LikeWithPost,
  Post,
  PostAuthor,
  PostBookmark,
  PostLike,
  PostWithAuthor,
} from '../domain/entities';
import { EngagementRepositoryPort } from '../domain/ports/engagement.repository.port';

const DEFAULT_AUTHOR: PostAuthor = {
  id: 'unknown',
  name: null,
  username: null,
  photoURL: null,
};

function makePost(partial: Partial<Post> & { id?: string; authorId?: string }): Post {
  const now = new Date();
  return {
    id: partial.id ?? randomUUID(),
    authorId: partial.authorId ?? 'someone',
    content: partial.content ?? null,
    hashtags: partial.hashtags ?? [],
    imageUrl: partial.imageUrl ?? null,
    linkUrl: partial.linkUrl ?? null,
    linkPreview: partial.linkPreview ?? null,
    isRepost: partial.isRepost ?? false,
    originalPostId: partial.originalPostId ?? null,
    scheduledAt: partial.scheduledAt ?? null,
    isPublished: partial.isPublished ?? true,
    threadId: partial.threadId ?? null,
    pollOptions: partial.pollOptions ?? null,
    pollDeadline: partial.pollDeadline ?? null,
    votesCount: partial.votesCount ?? 0,
    codeSnippet: partial.codeSnippet ?? null,
    codeLanguage: partial.codeLanguage ?? null,
    likesCount: partial.likesCount ?? 0,
    commentsCount: partial.commentsCount ?? 0,
    repostsCount: partial.repostsCount ?? 0,
    bookmarksCount: partial.bookmarksCount ?? 0,
    isDeleted: partial.isDeleted ?? false,
    deletedAt: partial.deletedAt ?? null,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  };
}

export class InMemoryEngagementRepository extends EngagementRepositoryPort {
  readonly posts = new Map<string, Post>();
  readonly likes: PostLike[] = [];
  readonly bookmarks: PostBookmark[] = [];
  readonly authors = new Map<string, PostAuthor>();

  seedPost(partial: Partial<Post> & { id?: string }): Post {
    const post = makePost(partial);
    this.posts.set(post.id, post);
    if (!this.authors.has(post.authorId)) {
      this.authors.set(post.authorId, { ...DEFAULT_AUTHOR, id: post.authorId });
    }
    return post;
  }

  seedLike(postId: string, userId: string): void {
    this.likes.push({ id: randomUUID(), postId, userId, createdAt: new Date() });
  }

  seedBookmark(postId: string, userId: string): void {
    this.bookmarks.push({ id: randomUUID(), postId, userId, createdAt: new Date() });
  }

  seedRepost(originalPostId: string, authorId: string): void {
    const repost = makePost({ authorId, isRepost: true, originalPostId });
    this.posts.set(repost.id, repost);
  }

  findRawPost(id: string): Post | null {
    return this.posts.get(id) ?? null;
  }

  findRawLike(postId: string, userId: string): PostLike | null {
    return this.likes.find((l) => l.postId === postId && l.userId === userId) ?? null;
  }

  private authorOf(id: string): PostAuthor {
    return this.authors.get(id) ?? { ...DEFAULT_AUTHOR, id };
  }

  // ---------- port impl ----------
  async findPostById(id: string): Promise<Post | null> {
    return this.posts.get(id) ?? null;
  }

  async findLike(postId: string, userId: string): Promise<PostLike | null> {
    return this.findRawLike(postId, userId);
  }

  async createLike(postId: string, userId: string): Promise<void> {
    this.seedLike(postId, userId);
  }

  async deleteLike(postId: string, userId: string): Promise<void> {
    for (let i = this.likes.length - 1; i >= 0; i--) {
      if (this.likes[i].postId === postId && this.likes[i].userId === userId) {
        this.likes.splice(i, 1);
      }
    }
  }

  async incrementLikesCount(postId: string, by: number): Promise<void> {
    const p = this.posts.get(postId);
    if (p) this.posts.set(postId, { ...p, likesCount: p.likesCount + by });
  }

  async listLikesByUser(
    userId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<LikeWithPost[]> {
    const cursorDate = cursor ? new Date(cursor) : null;
    return this.likes
      .filter((l) => l.userId === userId && (cursorDate ? l.createdAt < cursorDate : true))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map((l) => {
        const post = this.posts.get(l.postId);
        return {
          postId: l.postId,
          userId: l.userId,
          createdAt: l.createdAt,
          post: {
            id: post?.id ?? l.postId,
            content: post?.content ?? null,
            authorId: post?.authorId ?? 'unknown',
            author: this.authorOf(post?.authorId ?? 'unknown'),
          },
        };
      });
  }

  async findBookmark(postId: string, userId: string): Promise<PostBookmark | null> {
    return this.bookmarks.find((b) => b.postId === postId && b.userId === userId) ?? null;
  }

  async createBookmark(postId: string, userId: string): Promise<void> {
    this.seedBookmark(postId, userId);
  }

  async deleteBookmark(postId: string, userId: string): Promise<void> {
    for (let i = this.bookmarks.length - 1; i >= 0; i--) {
      if (this.bookmarks[i].postId === postId && this.bookmarks[i].userId === userId) {
        this.bookmarks.splice(i, 1);
      }
    }
  }

  async incrementBookmarksCount(postId: string, by: number): Promise<void> {
    const p = this.posts.get(postId);
    if (p) this.posts.set(postId, { ...p, bookmarksCount: p.bookmarksCount + by });
  }

  async findExistingRepost(
    originalPostId: string,
    authorId: string,
  ): Promise<{ id: string } | null> {
    const found = [...this.posts.values()].find(
      (p) =>
        p.isRepost &&
        p.originalPostId === originalPostId &&
        p.authorId === authorId &&
        !p.isDeleted,
    );
    return found ? { id: found.id } : null;
  }

  async createRepost(input: {
    authorId: string;
    originalPostId: string;
    content: string;
    hashtags: string[];
  }): Promise<PostWithAuthor> {
    const post = makePost({
      authorId: input.authorId,
      isRepost: true,
      content: input.content,
      hashtags: input.hashtags,
      originalPostId: input.originalPostId,
    });
    this.posts.set(post.id, post);
    return { ...post, author: this.authorOf(input.authorId) };
  }

  async incrementRepostsCount(postId: string, by: number): Promise<void> {
    const p = this.posts.get(postId);
    if (p) this.posts.set(postId, { ...p, repostsCount: p.repostsCount + by });
  }
}
