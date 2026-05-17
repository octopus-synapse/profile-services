/**
 * In-memory `CommentRepositoryPort` for use-case specs.
 */

import { randomUUID } from 'node:crypto';
import { tryDecodeCursor } from '@/shared-kernel/persistence/composite-cursor';
import type {
  Comment,
  CommentWithAuthor,
  CommentWithPost,
  CommentWithReplies,
  PostAuthor,
} from '../domain/entities';
import { CommentRepositoryPort } from '../domain/ports/comment.repository.port';

/**
 * Decode a cursor that may be either a legacy ISO timestamp or a
 * composite `(createdAt, id)` payload encoded via `encodeCursor`.
 * Returns the lower boundary the in-memory filter should use; mirrors
 * the SQL predicate `createdAt < c.createdAt OR (createdAt = c.createdAt AND id < c.id)`.
 */
function decodeLowerBound(cursor: string | undefined): { at: Date; id: string | null } | null {
  if (!cursor) return null;
  const decoded = tryDecodeCursor(cursor);
  if (decoded) return { at: decoded.createdAt, id: decoded.id };
  const legacy = new Date(cursor);
  if (Number.isNaN(legacy.getTime())) return null;
  return { at: legacy, id: null };
}

function strictlyBelow(
  row: { createdAt: Date; id: string },
  b: { at: Date; id: string | null },
): boolean {
  if (row.createdAt < b.at) return true;
  if (row.createdAt > b.at) return false;
  return b.id === null ? false : row.id < b.id;
}

interface PostRow {
  id: string;
  isDeleted: boolean;
  type: string;
  content: string | null;
  authorId: string;
}

const DEFAULT_AUTHOR: PostAuthor = {
  id: 'unknown',
  name: null,
  username: null,
  photoURL: null,
};

export class InMemoryCommentRepository extends CommentRepositoryPort {
  readonly comments: Comment[] = [];
  readonly posts = new Map<string, PostRow>();
  readonly authors = new Map<string, PostAuthor>();
  readonly commentsCounts = new Map<string, number>();

  // ---------- seed helpers ----------
  seedPost(
    id: string,
    overrides: Partial<{
      type: string;
      content: string | null;
      authorId: string;
      isDeleted: boolean;
    }> = {},
  ): PostRow {
    const row: PostRow = {
      id,
      isDeleted: overrides.isDeleted ?? false,
      type: overrides.type ?? 'TEXT',
      content: overrides.content ?? null,
      authorId: overrides.authorId ?? 'post-author',
    };
    this.posts.set(id, row);
    return row;
  }

  seedComment(
    partial: Partial<Comment> & { id?: string; postId: string; authorId: string },
  ): Comment {
    const now = new Date(partial.createdAt ?? Date.now() + this.comments.length);
    const c: Comment = {
      id: partial.id ?? randomUUID(),
      postId: partial.postId,
      authorId: partial.authorId,
      content: partial.content ?? '',
      parentId: partial.parentId ?? null,
      isDeleted: partial.isDeleted ?? false,
      deletedAt: partial.deletedAt ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.comments.push(c);
    return c;
  }

  seedAuthor(author: Partial<PostAuthor> & { id: string }): void {
    this.authors.set(author.id, { ...DEFAULT_AUTHOR, ...author });
  }

  findRaw(id: string): Comment | null {
    return this.comments.find((c) => c.id === id) ?? null;
  }

  commentsCountFor(postId: string): number {
    return this.commentsCounts.get(postId) ?? 0;
  }

  private authorOf(id: string): PostAuthor {
    return this.authors.get(id) ?? { ...DEFAULT_AUTHOR, id };
  }

  // ---------- port implementation ----------
  async findPostById(postId: string): Promise<{ id: string; isDeleted: boolean } | null> {
    const p = this.posts.get(postId);
    return p ? { id: p.id, isDeleted: p.isDeleted } : null;
  }

  async findCommentById(id: string): Promise<Comment | null> {
    return this.findRaw(id);
  }

  async createComment(input: {
    postId: string;
    authorId: string;
    content: string;
    parentId?: string;
  }): Promise<CommentWithAuthor> {
    const c = this.seedComment({
      postId: input.postId,
      authorId: input.authorId,
      content: input.content,
      parentId: input.parentId ?? null,
    });
    return { ...c, author: this.authorOf(input.authorId) };
  }

  async markCommentDeleted(id: string): Promise<Comment> {
    const idx = this.comments.findIndex((c) => c.id === id);
    if (idx < 0) throw new Error(`Comment ${id} not found`);
    // P1-067 — mirror the prisma adapter: write `deletedAt` alongside
    // the boolean so specs that exercise the audit-trail behaviour
    // see the same shape.
    const next = { ...this.comments[idx], isDeleted: true, deletedAt: new Date() };
    this.comments[idx] = next;
    return next;
  }

  async softDeleteCommentIfActive(
    id: string,
  ): Promise<{ mutated: boolean; postId: string | null }> {
    const idx = this.comments.findIndex((c) => c.id === id);
    if (idx < 0) return { mutated: false, postId: null };
    const current = this.comments[idx];
    if (current.isDeleted) return { mutated: false, postId: current.postId };
    this.comments[idx] = { ...current, isDeleted: true, deletedAt: new Date() };
    return { mutated: true, postId: current.postId };
  }

  async incrementPostCommentsCount(postId: string, by: number): Promise<void> {
    this.commentsCounts.set(postId, (this.commentsCounts.get(postId) ?? 0) + by);
  }

  async listTopLevelByPost(
    postId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<CommentWithReplies[]> {
    const bound = decodeLowerBound(cursor);
    const top = this.comments
      .filter(
        (c) =>
          c.postId === postId &&
          !c.parentId &&
          !c.isDeleted &&
          (bound ? strictlyBelow({ createdAt: c.createdAt, id: c.id }, bound) : true),
      )
      .sort((a, b) => {
        const t = b.createdAt.getTime() - a.createdAt.getTime();
        return t !== 0 ? t : b.id.localeCompare(a.id);
      })
      .slice(0, limit);

    return top.map((c) => ({
      ...c,
      author: this.authorOf(c.authorId),
      replies: this.comments
        .filter((r) => r.parentId === c.id && !r.isDeleted)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .slice(0, 3)
        .map((r) => ({ ...r, author: this.authorOf(r.authorId) })),
    }));
  }

  async listRepliesByComment(
    commentId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<CommentWithAuthor[]> {
    const cursorDate = cursor ? new Date(cursor) : null;
    return this.comments
      .filter(
        (c) =>
          c.parentId === commentId &&
          !c.isDeleted &&
          (cursorDate ? c.createdAt < cursorDate : true),
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, limit)
      .map((c) => ({ ...c, author: this.authorOf(c.authorId) }));
  }

  async listByAuthor(
    userId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<CommentWithPost[]> {
    const bound = decodeLowerBound(cursor);
    return this.comments
      .filter(
        (c) =>
          c.authorId === userId &&
          !c.isDeleted &&
          (bound ? strictlyBelow({ createdAt: c.createdAt, id: c.id }, bound) : true),
      )
      .sort((a, b) => {
        const t = b.createdAt.getTime() - a.createdAt.getTime();
        return t !== 0 ? t : b.id.localeCompare(a.id);
      })
      .slice(0, limit)
      .map((c) => {
        const post = this.posts.get(c.postId);
        return {
          ...c,
          author: this.authorOf(c.authorId),
          post: {
            id: post?.id ?? c.postId,
            type: post?.type ?? 'TEXT',
            content: post?.content ?? null,
            authorId: post?.authorId ?? 'unknown',
            author: this.authorOf(post?.authorId ?? 'unknown'),
          },
        };
      });
  }
}
