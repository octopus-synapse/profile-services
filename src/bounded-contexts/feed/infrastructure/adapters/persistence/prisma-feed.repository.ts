/**
 * Prisma adapter for `FeedRepositoryPort`. Owns every read/write the
 * timeline / post slice needs — feed candidate fetching, viewer-relative
 * decoration lookups, thread context, bookmarks, and the small post
 * CRUD surface.
 */

import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import type {
  BookmarkedFeedItem,
  PersistPostInput,
  Post,
  PostType,
  PostWithAuthor,
  PostWithRelations,
  ReactionType,
  UserPostsResult,
} from '../../../domain/entities';
import { FeedRepositoryPort } from '../../../domain/ports/feed.repository.port';

const AUTHOR_SELECT = {
  id: true,
  name: true,
  username: true,
  photoURL: true,
  bio: true,
  location: true,
} as const;

export class PrismaFeedRepository extends FeedRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  // ---------- Post CRUD ----------
  async createPost(authorId: string, input: PersistPostInput): Promise<PostWithAuthor> {
    return (await this.prisma.post.create({
      data: {
        authorId,
        type: input.type,
        subtype: input.subtype,
        content: input.content,
        hardSkills: input.hardSkills ?? [],
        softSkills: input.softSkills ?? [],
        hashtags: input.hashtags,
        data: (input.data as Prisma.InputJsonValue | undefined) ?? undefined,
        imageUrl: input.imageUrl,
        linkUrl: input.linkUrl,
        linkPreview: (input.linkPreview as Prisma.InputJsonValue | undefined) ?? undefined,
        originalPostId: input.originalPostId,
        coAuthors: input.coAuthors ?? [],
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
        isPublished: input.isPublished,
        threadId: input.threadId,
        codeSnippet: input.codeSnippet
          ? (input.codeSnippet as unknown as Prisma.InputJsonValue)
          : undefined,
        isAnonymous: input.isAnonymous === true,
        anonymousCategory: input.isAnonymous ? (input.anonymousCategory ?? null) : null,
      },
      include: { author: { select: AUTHOR_SELECT } },
    })) as unknown as PostWithAuthor;
  }

  async findPostById(id: string): Promise<Post | null> {
    return (await this.prisma.post.findUnique({ where: { id } })) as Post | null;
  }

  async findPostByIdWithRelations(id: string): Promise<PostWithRelations | null> {
    return (await this.prisma.post.findUnique({
      where: { id },
      include: {
        author: { select: AUTHOR_SELECT },
        originalPost: { include: { author: { select: AUTHOR_SELECT } } },
      },
    })) as unknown as PostWithRelations | null;
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
    type?: PostType;
    followingOnly: boolean;
    followingIds: string[];
    userId: string;
  }): Promise<PostWithRelations[]> {
    const { cursor, take, type, followingOnly, followingIds, userId } = params;
    return (await this.prisma.post.findMany({
      where: {
        isDeleted: false,
        ...(type ? { type } : {}),
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
        ...(followingOnly
          ? { authorId: { in: followingIds }, isPublished: true }
          : { OR: [{ isPublished: true }, { authorId: userId, isPublished: false }] }),
      },
      include: {
        author: { select: AUTHOR_SELECT },
        originalPost: { include: { author: { select: AUTHOR_SELECT } } },
      },
      orderBy: { createdAt: 'desc' },
      take,
    })) as unknown as PostWithRelations[];
  }

  async listUserPosts(
    userId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<UserPostsResult> {
    const posts = (await this.prisma.post.findMany({
      where: {
        authorId: userId,
        isDeleted: false,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      include: {
        author: { select: AUTHOR_SELECT },
        originalPost: { include: { author: { select: AUTHOR_SELECT } } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })) as unknown as PostWithRelations[];

    const nextCursor =
      posts.length === limit ? posts[posts.length - 1].createdAt.toISOString() : null;
    return { items: posts, nextCursor, hasNext: nextCursor !== null };
  }

  async listBookmarks(
    userId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<{ posts: BookmarkedFeedItem[]; nextCursor: string | null }> {
    const bookmarks = await this.prisma.postBookmark.findMany({
      where: {
        userId,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      include: {
        post: {
          include: {
            author: { select: AUTHOR_SELECT },
            originalPost: { include: { author: { select: AUTHOR_SELECT } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const valid = bookmarks.filter((b) => !b.post.isDeleted);
    const posts: BookmarkedFeedItem[] = valid.map((b) => ({
      ...(b.post as unknown as PostWithRelations),
      bookmarkedAt: b.createdAt,
      isLiked: false,
      isBookmarked: true,
    }));
    const nextCursor =
      bookmarks.length === limit ? bookmarks[bookmarks.length - 1].createdAt.toISOString() : null;
    return { posts, nextCursor };
  }

  // ---------- Viewer-relative decoration ----------
  async findViewerEngagement(
    postIds: string[],
    userId: string,
  ): Promise<{
    likedPostMap: Map<string, ReactionType>;
    bookmarkedPostIds: Set<string>;
    repostedPostIds: Set<string>;
    voteByPostId: Map<string, number>;
  }> {
    if (postIds.length === 0) {
      return {
        likedPostMap: new Map(),
        bookmarkedPostIds: new Set(),
        repostedPostIds: new Set(),
        voteByPostId: new Map(),
      };
    }

    const [likes, bookmarks, myReposts, myVotes] = await Promise.all([
      this.prisma.postLike.findMany({
        where: { postId: { in: postIds }, userId },
        select: { postId: true, reactionType: true },
      }),
      this.prisma.postBookmark.findMany({
        where: { postId: { in: postIds }, userId },
        select: { postId: true },
      }),
      this.prisma.post.findMany({
        where: {
          authorId: userId,
          type: 'REPOST',
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
      likedPostMap: new Map(likes.map((l) => [l.postId, l.reactionType])),
      bookmarkedPostIds: new Set(bookmarks.map((b) => b.postId)),
      repostedPostIds: new Set(
        myReposts.map((r) => r.originalPostId).filter((id): id is string => Boolean(id)),
      ),
      voteByPostId: new Map(myVotes.map((v) => [v.postId, v.optionIndex])),
    };
  }

  async findThreadPosts(threadIds: string[]): Promise<Map<string, PostWithRelations[]>> {
    if (threadIds.length === 0) return new Map();
    const rows = (await this.prisma.post.findMany({
      where: {
        threadId: { in: threadIds },
        isDeleted: false,
        isPublished: true,
      },
      include: {
        author: { select: AUTHOR_SELECT },
        originalPost: { include: { author: { select: AUTHOR_SELECT } } },
      },
      orderBy: { createdAt: 'asc' },
    })) as unknown as PostWithRelations[];

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
