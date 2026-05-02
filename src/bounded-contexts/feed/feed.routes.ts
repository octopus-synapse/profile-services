/**
 * Route descriptors for the feed BC. Replaces the per-resource Nest
 * controllers (post, feed, comment, engagement, user-engagement) with
 * pure data the Nest adapter synthesizes at boot.
 *
 * Image upload (`POST /v1/posts/upload-image`) is now expressed as a
 * `kind: 'multipart'` route — the synthesizer wires the
 * `FileInterceptor` and `@UploadedFile()` plumbing automatically.
 */

import { AnonymousCategory, PostType, ReactionType } from '@prisma/client';
import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { FeedUseCases } from './application/ports/feed.port';
import { CreatePostSchema } from './dto/create-post-request.schema';

const IdParam = z.object({ id: z.string() });
const UserIdParam = z.object({ userId: z.string() });

const PaginationQuery = z.object({
  cursor: z.string().optional(),
  limit: z.string().optional(),
});

const TimelineQuery = PaginationQuery.extend({
  type: z.nativeEnum(PostType).optional(),
  followingOnly: z.string().optional(),
});

const LikeBodySchema = z.object({
  reactionType: z.enum(['LIKE', 'CELEBRATE', 'LOVE', 'INSIGHTFUL', 'CURIOUS'] as const).optional(),
});

const RepostBodySchema = z.object({ commentary: z.string().optional() });

const ReportBodySchema = z.object({ reason: z.string() });

const VoteBodySchema = z.object({ optionIndex: z.number().int().nonnegative() });

const CreateCommentBodySchema = z.object({
  content: z.string(),
  parentId: z.string().optional(),
});

function clampLimit(limit?: string): number {
  if (!limit) return 20;
  return Math.min(Number(limit), 50);
}

const COMPOSER_CONFIG = {
  maxLength: 3000,
  mediaTypes: ['image/png', 'image/jpeg', 'image/webp'] as const,
  maxImages: 4,
  maxImageBytes: 5 * 1024 * 1024,
  pollEnabled: true,
  pollMaxOptions: 4,
  pollMaxOptionLength: 80,
  repostEnabled: true,
  mentionLimit: 10,
  postTypes: Object.values(PostType),
} as const;

const ComposerConfigResponseSchema = z.object({
  maxLength: z.number().int(),
  mediaTypes: z.array(z.string()),
  maxImages: z.number().int(),
  maxImageBytes: z.number().int(),
  pollEnabled: z.boolean(),
  pollMaxOptions: z.number().int(),
  pollMaxOptionLength: z.number().int(),
  repostEnabled: z.boolean(),
  mentionLimit: z.number().int(),
  postTypes: z.array(z.nativeEnum(PostType)),
});

// ─── Shared post-shape schemas ────────────────────────────────────────
//
// These mirror the domain entities from `domain/entities/*`. The post
// `data`, `linkPreview`, and `codeSnippet` columns are persisted as
// JSON; we expose them as permissive `passthrough()` objects so
// arbitrary structured payloads round-trip without losing fields.

const PostAuthorSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  photoURL: z.string().nullable(),
  bio: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
});

const LinkPreviewDataSchema = z
  .object({
    title: z.string().nullable(),
    description: z.string().nullable(),
    image: z.string().nullable(),
    domain: z.string(),
  })
  .nullable();

const CodeSnippetSchema = z
  .object({
    language: z.string(),
    code: z.string(),
    filename: z.string().optional(),
  })
  .nullable();

const PostDataSchema = z.object({}).passthrough().nullable();

const BasePostSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  type: z.nativeEnum(PostType),
  subtype: z.string().nullable(),
  content: z.string().nullable(),
  hardSkills: z.array(z.string()),
  softSkills: z.array(z.string()),
  hashtags: z.array(z.string()),
  data: PostDataSchema,
  imageUrl: z.string().nullable(),
  linkUrl: z.string().nullable(),
  linkPreview: LinkPreviewDataSchema,
  originalPostId: z.string().nullable(),
  coAuthors: z.array(z.string()),
  scheduledAt: z.string().datetime().nullable(),
  isPublished: z.boolean(),
  threadId: z.string().nullable(),
  pollDeadline: z.string().datetime().nullable(),
  votesCount: z.number().int(),
  codeSnippet: CodeSnippetSchema,
  likesCount: z.number().int(),
  commentsCount: z.number().int(),
  repostsCount: z.number().int(),
  bookmarksCount: z.number().int(),
  isDeleted: z.boolean(),
  deletedAt: z.string().datetime().nullable(),
  isAnonymous: z.boolean(),
  anonymousCategory: z.nativeEnum(AnonymousCategory).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const PostWithAuthorSchema = BasePostSchema.extend({
  author: PostAuthorSchema,
});

const PostWithRelationsSchema = PostWithAuthorSchema.extend({
  originalPost: PostWithAuthorSchema.nullable().optional(),
});

const FeedItemSchema = PostWithRelationsSchema.extend({
  isLiked: z.boolean(),
  reactionType: z.nativeEnum(ReactionType).nullable(),
  isBookmarked: z.boolean(),
  isReposted: z.boolean(),
  hasVoted: z.boolean(),
  myVoteIndex: z.number().int().nullable(),
  threadPosts: z.array(PostWithRelationsSchema),
});

const BookmarkedFeedItemSchema = PostWithRelationsSchema.extend({
  bookmarkedAt: z.string().datetime(),
  isLiked: z.boolean(),
  isBookmarked: z.boolean(),
});

const FeedTimelineResponseSchema = z.object({
  posts: z.array(FeedItemSchema),
  nextCursor: z.string().nullable(),
});

const FeedBookmarksResponseSchema = z.object({
  posts: z.array(BookmarkedFeedItemSchema),
  nextCursor: z.string().nullable(),
});

const UserPostsResponseSchema = z.object({
  posts: z.array(PostWithRelationsSchema),
  nextCursor: z.string().nullable(),
});

// ─── Comments ───────────────────────────────────────────────────────
const CommentBaseSchema = z.object({
  id: z.string(),
  postId: z.string(),
  authorId: z.string(),
  content: z.string(),
  parentId: z.string().nullable(),
  isDeleted: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const CommentWithAuthorSchema = CommentBaseSchema.extend({
  author: PostAuthorSchema,
});

const CommentWithRepliesSchema = CommentWithAuthorSchema.extend({
  replies: z.array(CommentWithAuthorSchema),
});

const CommentWithPostSchema = CommentWithAuthorSchema.extend({
  post: z.object({
    id: z.string(),
    type: z.string(),
    content: z.string().nullable(),
    authorId: z.string(),
    author: PostAuthorSchema,
  }),
});

const CommentsListResponseSchema = z.object({
  comments: z.array(CommentWithRepliesSchema),
  nextCursor: z.string().nullable(),
});

const UserCommentsResponseSchema = z.object({
  comments: z.array(CommentWithPostSchema),
  nextCursor: z.string().nullable(),
});

// ─── Engagement ─────────────────────────────────────────────────────
const LikePostResponseSchema = z.object({
  postId: z.string(),
  userId: z.string(),
  reactionType: z.nativeEnum(ReactionType),
  postAuthorId: z.string().optional(),
  alreadyLiked: z.boolean(),
  updated: z.boolean().optional(),
});

const UnlikePostResponseSchema = z.object({
  postId: z.string(),
  userId: z.string(),
});

const BookmarkPostResponseSchema = z.object({
  postId: z.string(),
  userId: z.string(),
  alreadyBookmarked: z.boolean(),
});

const UnbookmarkPostResponseSchema = z.object({
  postId: z.string(),
  userId: z.string(),
});

const RepostPostResponseSchema = z.union([
  PostWithAuthorSchema,
  z.object({
    postId: z.string(),
    userId: z.string(),
    reposted: z.boolean(),
  }),
]);

const ReportPostResponseSchema = z.object({
  id: z.string(),
  postId: z.string(),
  userId: z.string(),
  reason: z.string(),
  status: z.string(),
  createdAt: z.string().datetime(),
});

const PollVoteResponseSchema = z.object({
  id: z.string(),
  postId: z.string(),
  userId: z.string(),
  optionIndex: z.number().int(),
  createdAt: z.string().datetime(),
});

const ReactionWithPostSchema = z.object({
  postId: z.string(),
  userId: z.string(),
  reactionType: z.nativeEnum(ReactionType),
  createdAt: z.string().datetime(),
  post: z.object({
    id: z.string(),
    type: z.string(),
    content: z.string().nullable(),
    authorId: z.string(),
    author: PostAuthorSchema,
  }),
});

const UserReactionsResponseSchema = z.object({
  reactions: z.array(ReactionWithPostSchema),
  nextCursor: z.string().nullable(),
});

// ─── Misc ───────────────────────────────────────────────────────────
const DeletedResponseSchema = z.object({ deleted: z.literal(true) });

const PostImageUploadResponseSchema = z.object({
  url: z.string(),
  key: z.string(),
});

export const feedRoutes: ReadonlyArray<Route<FeedUseCases>> = [
  // ─── Composer config ──────────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/posts/composer-config',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    response: ComposerConfigResponseSchema,
    openapi: {
      summary: 'Composer configuration (server-driven UI)',
      tags: ['posts'],
      description:
        'Returns the server-driven composer config the frontend uses to render the post-creation UI: limits, allowed media types, poll/repost availability, mention cap, post types.',
    },
    sdk: { exported: true },
    handler: async () => ({ ...COMPOSER_CONFIG }),
  },

  // ─── Posts ────────────────────────────────────────────────────────
  {
    method: 'POST',
    path: '/v1/posts',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    body: CreatePostSchema,
    response: PostWithAuthorSchema,
    openapi: {
      summary: 'Create a new post',
      tags: ['posts'],
      description: 'Posts API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      return bc.createPost.execute(
        ctx.user!.userId,
        ctx.body as Parameters<typeof bc.createPost.execute>[1],
      );
    },
  },
  {
    method: 'GET',
    path: '/v1/posts/:id',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: IdParam,
    response: PostWithRelationsSchema,
    openapi: {
      summary: 'Get a post by ID',
      tags: ['posts'],
      description: 'Posts API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      return bc.getPost.execute(id);
    },
  },
  {
    method: 'DELETE',
    path: '/v1/posts/:id',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: IdParam,
    response: DeletedResponseSchema,
    openapi: {
      summary: 'Delete a post',
      tags: ['posts'],
      description: 'Posts API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      await bc.deletePost.execute(id, ctx.user!.userId);
      return { deleted: true };
    },
  },

  // ─── Feed ─────────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/feed',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    query: TimelineQuery,
    response: FeedTimelineResponseSchema,
    openapi: {
      summary: 'Get feed timeline',
      tags: ['feed'],
      description: 'Feed API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const q = ctx.query as z.infer<typeof TimelineQuery>;
      return bc.listFeedTimeline.execute({
        userId: ctx.user!.userId,
        cursor: q.cursor,
        limit: clampLimit(q.limit),
        type: q.type,
        followingOnly: q.followingOnly === 'true' || q.followingOnly === '1',
      });
    },
  },
  {
    method: 'GET',
    path: '/v1/feed/bookmarks',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    query: PaginationQuery,
    response: FeedBookmarksResponseSchema,
    openapi: {
      summary: 'Get bookmarked posts',
      tags: ['feed'],
      description: 'Feed API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const q = ctx.query as z.infer<typeof PaginationQuery>;
      return bc.listFeedBookmarks.execute(ctx.user!.userId, q.cursor, clampLimit(q.limit));
    },
  },
  {
    method: 'GET',
    path: '/v1/feed/user/:userId',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: UserIdParam,
    query: PaginationQuery,
    response: UserPostsResponseSchema,
    openapi: {
      summary: 'Get posts by user',
      tags: ['feed'],
      description: 'Feed API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { userId } = ctx.params as { userId: string };
      const q = ctx.query as z.infer<typeof PaginationQuery>;
      return bc.listUserPosts.execute(userId, q.cursor, clampLimit(q.limit));
    },
  },

  // ─── Comments ─────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/posts/:id/comments',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: IdParam,
    query: PaginationQuery,
    response: CommentsListResponseSchema,
    openapi: {
      summary: 'Get comments for a post',
      tags: ['comments'],
      description: 'Comments API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      const q = ctx.query as z.infer<typeof PaginationQuery>;
      return bc.listPostComments.execute(id, q.cursor, clampLimit(q.limit));
    },
  },
  {
    method: 'POST',
    path: '/v1/posts/:id/comments',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: IdParam,
    body: CreateCommentBodySchema,
    response: CommentWithAuthorSchema,
    openapi: {
      summary: 'Create a comment',
      tags: ['comments'],
      description: 'Comments API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      const body = ctx.body as z.infer<typeof CreateCommentBodySchema>;
      return bc.createComment.execute(id, ctx.user!.userId, body.content, body.parentId);
    },
  },
  {
    method: 'DELETE',
    path: '/v1/posts/comments/:id',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: IdParam,
    response: DeletedResponseSchema,
    openapi: {
      summary: 'Delete a comment',
      tags: ['comments'],
      description: 'Comments API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      await bc.deleteComment.execute(id, ctx.user!.userId);
      return { deleted: true };
    },
  },

  // ─── Engagement ───────────────────────────────────────────────────
  {
    method: 'POST',
    path: '/v1/posts/:id/like',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: IdParam,
    body: LikeBodySchema,
    response: LikePostResponseSchema,
    openapi: {
      summary: 'Like a post',
      tags: ['engagement'],
      description: 'Engagement API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      const body = ctx.body as { reactionType?: ReactionType };
      return bc.likePost.execute(id, ctx.user!.userId, body.reactionType);
    },
  },
  {
    method: 'DELETE',
    path: '/v1/posts/:id/like',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: IdParam,
    response: UnlikePostResponseSchema,
    openapi: {
      summary: 'Unlike a post',
      tags: ['engagement'],
      description: 'Engagement API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      return bc.unlikePost.execute(id, ctx.user!.userId);
    },
  },
  {
    method: 'POST',
    path: '/v1/posts/:id/bookmark',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: IdParam,
    response: BookmarkPostResponseSchema,
    openapi: {
      summary: 'Bookmark a post',
      tags: ['engagement'],
      description: 'Engagement API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      return bc.bookmarkPost.execute(id, ctx.user!.userId);
    },
  },
  {
    method: 'DELETE',
    path: '/v1/posts/:id/bookmark',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: IdParam,
    response: UnbookmarkPostResponseSchema,
    openapi: {
      summary: 'Remove bookmark from a post',
      tags: ['engagement'],
      description: 'Engagement API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      return bc.unbookmarkPost.execute(id, ctx.user!.userId);
    },
  },
  {
    method: 'POST',
    path: '/v1/posts/:id/repost',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: IdParam,
    body: RepostBodySchema,
    response: RepostPostResponseSchema,
    openapi: {
      summary: 'Repost a post',
      tags: ['engagement'],
      description: 'Engagement API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      const body = ctx.body as z.infer<typeof RepostBodySchema>;
      return bc.repostPost.execute(id, ctx.user!.userId, body.commentary);
    },
  },
  {
    method: 'POST',
    path: '/v1/posts/:id/report',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: IdParam,
    body: ReportBodySchema,
    response: ReportPostResponseSchema,
    openapi: {
      summary: 'Report a post',
      tags: ['engagement'],
      description: 'Engagement API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      const body = ctx.body as z.infer<typeof ReportBodySchema>;
      return bc.reportPost.execute(id, ctx.user!.userId, body.reason);
    },
  },
  {
    method: 'POST',
    path: '/v1/posts/:id/poll/vote',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: IdParam,
    body: VoteBodySchema,
    response: PollVoteResponseSchema,
    openapi: {
      summary: 'Vote on a poll',
      tags: ['engagement'],
      description: 'Engagement API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      const body = ctx.body as z.infer<typeof VoteBodySchema>;
      return bc.voteOnPoll.execute(id, ctx.user!.userId, body.optionIndex);
    },
  },

  // ─── User-scoped engagement ───────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/users/:userId/comments',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: UserIdParam,
    query: PaginationQuery,
    response: UserCommentsResponseSchema,
    openapi: {
      summary: 'List comments authored by a user',
      tags: ['user-engagement'],
      description: 'User-scoped feed engagement',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { userId } = ctx.params as { userId: string };
      const q = ctx.query as z.infer<typeof PaginationQuery>;
      return bc.listUserComments.execute(userId, q.cursor, q.limit ? Number(q.limit) : undefined);
    },
  },
  {
    method: 'GET',
    path: '/v1/users/:userId/reactions',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: UserIdParam,
    query: PaginationQuery,
    response: UserReactionsResponseSchema,
    openapi: {
      summary: 'List reactions given by a user',
      tags: ['user-engagement'],
      description: 'User-scoped feed engagement',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { userId } = ctx.params as { userId: string };
      const q = ctx.query as z.infer<typeof PaginationQuery>;
      return bc.listUserReactions.execute(userId, q.cursor, q.limit ? Number(q.limit) : undefined);
    },
  },

  // ─── Multipart: post image upload ─────────────────────────────────
  {
    method: 'POST',
    path: '/v1/posts/upload-image',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    kind: 'multipart',
    statusCode: 200,
    response: PostImageUploadResponseSchema,
    openapi: {
      summary: 'Upload post image',
      tags: ['posts'],
      description: 'Posts API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const file = (ctx.body as { file?: Express.Multer.File }).file;
      return bc.uploadPostImage.execute(
        file
          ? {
              userId: ctx.user!.userId,
              buffer: file.buffer,
              originalName: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
            }
          : null,
      );
    },
  },
];
