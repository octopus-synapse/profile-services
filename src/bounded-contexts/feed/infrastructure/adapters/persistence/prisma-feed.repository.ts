/**
 * Prisma adapter for `FeedRepositoryPort`. Owns every read/write the
 * timeline / post slice needs — feed candidate fetching, viewer-relative
 * decoration lookups, thread context, bookmarks, and the small post
 * CRUD surface.
 */

import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import {
  compositeCursorWhere as buildCompositeCursorWhere,
  encodeCursor,
} from '@/shared-kernel/persistence/composite-cursor';
import { runInTransaction } from '@/shared-kernel/persistence/transaction';
import type {
  BookmarkedFeedItem,
  PersistPostInput,
  Post,
  PostWithAuthor,
  PostWithRelations,
  UserPostsResult,
} from '../../../domain/entities';
import { FeedRepositoryPort } from '../../../domain/ports/feed.repository.port';
import {
  POST_WITH_AUTHOR_INCLUDE,
  POST_WITH_RELATIONS_INCLUDE,
  toPostWithAuthor,
  toPostWithRelations,
} from './post-row.mappers';

/**
 * P1 #35 — Build a Prisma `where` fragment for the composite
 * `(createdAt, id)` cursor. Thin wrapper around the shared-kernel
 * helper to keep the local `Prisma.PostWhereInput` signature inferred
 * cleanly at every call site (the shared union type widens to "any
 * model with createdAt+id", which Prisma's generated where types
 * cannot narrow on their own).
 */
function compositeCursorWhere(cursor: string | undefined): Prisma.PostWhereInput {
  return buildCompositeCursorWhere(cursor) as Prisma.PostWhereInput;
}

export class PrismaFeedRepository extends FeedRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  // ---------- Post CRUD ----------
  async createPost(authorId: string, input: PersistPostInput): Promise<PostWithAuthor> {
    return toPostWithAuthor(
      await this.prisma.post.create({
        data: {
          authorId,
          content: input.content,
          hashtags: input.hashtags,
          imageUrl: input.imageUrl,
          linkUrl: input.linkUrl,
          linkPreview: (input.linkPreview as Prisma.InputJsonValue | undefined) ?? undefined,
          isRepost: input.isRepost === true,
          originalPostId: input.originalPostId,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
          isPublished: input.isPublished,
          threadId: input.threadId,
          pollOptions: (input.pollOptions as Prisma.InputJsonValue | undefined) ?? undefined,
          pollDeadline: input.pollDeadline ? new Date(input.pollDeadline) : undefined,
          codeSnippet: input.codeSnippet,
          codeLanguage: input.codeLanguage,
        },
        include: POST_WITH_AUTHOR_INCLUDE,
      }),
    );
  }

  async findPostById(id: string): Promise<Post | null> {
    return (await this.prisma.post.findUnique({ where: { id } })) as Post | null;
  }

  async findPostByIdWithRelations(id: string): Promise<PostWithRelations | null> {
    const row = await this.prisma.post.findUnique({
      where: { id },
      include: POST_WITH_RELATIONS_INCLUDE,
    });
    return row ? toPostWithRelations(row) : null;
  }

  async markPostDeleted(id: string): Promise<Post> {
    return (await this.prisma.post.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    })) as Post;
  }

  async incrementRepostCount(originalPostId: string, by: number): Promise<void> {
    await this.prisma.post.update({
      where: { id: originalPostId },
      data: { repostsCount: { increment: by } },
    });
  }

  async softDeletePostInTx(
    id: string,
  ): Promise<{ mutated: boolean; originalPostId: string | null }> {
    // P1 #31 — atomic soft-delete + repost-count decrement. Reading
    // originalPostId before the flip and decrementing inside the
    // same tx prevents a window where the post is tombstoned but
    // the original still advertises an inflated repostsCount.
    return runInTransaction(this.prisma, async (tx) => {
      const row = await tx.post.findUnique({
        where: { id },
        select: { originalPostId: true, isDeleted: true },
      });
      if (!row || row.isDeleted) {
        return { mutated: false, originalPostId: row?.originalPostId ?? null };
      }
      const result = await tx.post.updateMany({
        where: { id, isDeleted: false },
        data: { isDeleted: true, deletedAt: new Date() },
      });
      if (result.count === 0) {
        return { mutated: false, originalPostId: row.originalPostId };
      }
      if (row.originalPostId) {
        await tx.post.update({
          where: { id: row.originalPostId },
          data: { repostsCount: { decrement: 1 } }, // lint-allow-magic-number: one repost removed = -1
        });
      }
      return { mutated: true, originalPostId: row.originalPostId };
    });
  }

  // ---------- Timeline / listings ----------
  async listFollowedAndConnectionIds(
    userId: string,
  ): Promise<{ followingIds: string[]; connectionIds: string[] }> {
    const [followingRecords, connectionRecords] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      }),
      this.prisma.connection.findMany({
        where: {
          status: 'ACCEPTED',
          OR: [{ requesterId: userId }, { targetId: userId }],
        },
        select: { requesterId: true, targetId: true },
      }),
    ]);

    return {
      followingIds: followingRecords.map((f) => f.followingId),
      connectionIds: connectionRecords.map((c) =>
        c.requesterId === userId ? c.targetId : c.requesterId,
      ),
    };
  }

  async listFeedPosts(params: {
    cursor?: string;
    take: number;
    followingOnly: boolean;
    followingIds: string[];
    userId: string;
  }): Promise<PostWithRelations[]> {
    const { cursor, take, followingOnly, followingIds, userId } = params;
    const rows = await this.prisma.post.findMany({
      where: {
        isDeleted: false,
        ...compositeCursorWhere(cursor),
        ...(followingOnly
          ? { authorId: { in: followingIds }, isPublished: true }
          : { OR: [{ isPublished: true }, { authorId: userId, isPublished: false }] }),
      },
      include: POST_WITH_RELATIONS_INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
    });
    return rows.map(toPostWithRelations);
  }

  async listUserPosts(
    userId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<UserPostsResult> {
    const posts = (
      await this.prisma.post.findMany({
        where: {
          authorId: userId,
          isDeleted: false,
          ...compositeCursorWhere(cursor),
        },
        include: POST_WITH_RELATIONS_INCLUDE,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit,
      })
    ).map(toPostWithRelations);

    const last = posts[posts.length - 1];
    const nextCursor =
      posts.length === limit && last ? encodeCursor(last.createdAt, last.id) : null;
    return { items: posts, nextCursor, hasNext: nextCursor !== null };
  }

  async listBookmarks(
    userId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<{ posts: BookmarkedFeedItem[]; nextCursor: string | null }> {
    // P1 #35 — composite (createdAt, id) cursor over the
    // `PostBookmark` row's own timestamp so two users bookmarking the
    // same post inside the same millisecond don't drop either bookmark
    // from the page boundary.
    const bookmarks = await this.prisma.postBookmark.findMany({
      where: {
        userId,
        ...buildCompositeCursorWhere(cursor),
      },
      include: { post: { include: POST_WITH_RELATIONS_INCLUDE } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });

    const valid = bookmarks.filter((b) => !b.post.isDeleted);
    const posts: BookmarkedFeedItem[] = valid.map((b) => ({
      ...toPostWithRelations(b.post),
      bookmarkedAt: b.createdAt,
      isLiked: false,
      isBookmarked: true,
    }));
    const last = bookmarks[bookmarks.length - 1];
    const nextCursor =
      bookmarks.length === limit && last ? encodeCursor(last.createdAt, last.id) : null;
    return { posts, nextCursor };
  }

  // ---------- Viewer-relative decoration ----------
  async findViewerEngagement(
    postIds: string[],
    userId: string,
  ): Promise<{
    likedPostIds: Set<string>;
    bookmarkedPostIds: Set<string>;
    repostedPostIds: Set<string>;
    voteByPostId: Map<string, number>;
  }> {
    if (postIds.length === 0) {
      return {
        likedPostIds: new Set(),
        bookmarkedPostIds: new Set(),
        repostedPostIds: new Set(),
        voteByPostId: new Map(),
      };
    }

    const [likes, bookmarks, myReposts, myVotes] = await Promise.all([
      this.prisma.postLike.findMany({
        where: { postId: { in: postIds }, userId },
        select: { postId: true },
      }),
      this.prisma.postBookmark.findMany({
        where: { postId: { in: postIds }, userId },
        select: { postId: true },
      }),
      this.prisma.post.findMany({
        where: {
          authorId: userId,
          isRepost: true,
          originalPostId: { in: postIds },
          isDeleted: false,
        },
        select: { originalPostId: true },
      }),
      this.prisma.pollVote.findMany({
        where: { postId: { in: postIds }, userId },
        select: { postId: true, optionIndex: true },
      }),
    ]);

    return {
      likedPostIds: new Set(likes.map((l) => l.postId)),
      bookmarkedPostIds: new Set(bookmarks.map((b) => b.postId)),
      repostedPostIds: new Set(
        myReposts.map((r) => r.originalPostId).filter((id): id is string => Boolean(id)),
      ),
      voteByPostId: new Map(myVotes.map((v) => [v.postId, v.optionIndex])),
    };
  }

  async findThreadPosts(threadIds: string[]): Promise<Map<string, PostWithRelations[]>> {
    if (threadIds.length === 0) return new Map();
    const rows = (
      await this.prisma.post.findMany({
        where: {
          threadId: { in: threadIds },
          isDeleted: false,
          isPublished: true,
        },
        include: POST_WITH_RELATIONS_INCLUDE,
        orderBy: { createdAt: 'asc' },
      })
    ).map(toPostWithRelations);

    const map = new Map<string, PostWithRelations[]>();
    for (const r of rows) {
      if (!r.threadId) continue;
      const list = map.get(r.threadId) ?? [];
      list.push(r);
      map.set(r.threadId, list);
    }
    return map;
  }

  async findLikedPostIds(postIds: string[], userId: string): Promise<Set<string>> {
    if (postIds.length === 0) return new Set();
    const rows = await this.prisma.postLike.findMany({
      where: { postId: { in: postIds }, userId },
      select: { postId: true },
    });
    return new Set(rows.map((r) => r.postId));
  }
}
