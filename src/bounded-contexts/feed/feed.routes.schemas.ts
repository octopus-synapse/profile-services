/**
 * Route descriptors for the feed BC. Replaces the per-resource Nest
 * controllers (post, feed, comment, engagement, user-engagement) with
 * pure data the Nest adapter synthesizes at boot.
 *
 * Image upload (`POST /v1/posts/upload-image`) is now expressed as a
 * `kind: 'multipart'` route — the synthesizer wires the
 * `FileInterceptor` and `@UploadedFile()` plumbing automatically.
 */

import { z } from 'zod';
import { CursorPaginatedResponseSchema } from '@/shared-kernel/schemas/common/api.types';
import { IdParamSchema } from '@/shared-kernel/schemas/params';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

export const IdParam = IdParamSchema;
export const UserIdParam = z.object({ userId: z.string().uuid() });

export const PaginationQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).optional(),
});

export const TimelineQuery = PaginationQuery.extend({
  followingOnly: z.string().optional(),
});

// Like is presence/absence of a PostLike row — no body needed.
export const LikeBodySchema = z.object({}).openapi({ example: {} });

export const RepostBodySchema = z.object({ commentary: z.string().optional() }).openapi({
  example: {
    commentary: 'Great insights, sharing this with my network.',
  },
});

export const ReportBodySchema = z.object({ reason: z.string() }).openapi({
  example: {
    reason: 'Spam or misleading content.',
  },
});

export const VoteBodySchema = z.object({ optionIndex: z.number().int().nonnegative() }).openapi({
  example: {
    optionIndex: 0,
  },
});

export const CreateCommentBodySchema = z
  .object({
    content: z.string(),
    parentId: z.string().uuid().optional(),
  })
  .openapi({
    example: {
      content: 'Congrats on the launch! What stack did you use?',
    },
  });

/**
 * Cap on `?limit=` for cursor-paginated feed/comment listings.
 *
 * Lower than the project-wide MAX_PAGE_SIZE (100) on purpose — feed
 * payloads are heavier (denormalised author + media), so 50 keeps a
 * page request from blowing past ~250 KB.
 */
export const FEED_MAX_PAGE_SIZE = 50;

export const COMPOSER_CONFIG = {
  maxLength: 3000,
  mediaTypes: ['image/png', 'image/jpeg', 'image/webp'] as const,
  maxImages: 1,
  maxImageBytes: 5 * 1024 * 1024,
  pollEnabled: true,
  pollMaxOptions: 4,
  pollMaxOptionLength: 80,
  repostEnabled: true,
  mentionLimit: 10,
  codeEnabled: true,
} as const;

export const ComposerConfigResponseSchema = z.object({
  maxLength: z.number().int(),
  mediaTypes: z.array(z.string()),
  maxImages: z.number().int(),
  maxImageBytes: z.number().int(),
  pollEnabled: z.boolean(),
  pollMaxOptions: z.number().int(),
  pollMaxOptionLength: z.number().int(),
  repostEnabled: z.boolean(),
  mentionLimit: z.number().int(),
  codeEnabled: z.boolean(),
});

// ─── Shared post-shape schemas ────────────────────────────────────────

export const PostAuthorSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  photoURL: z.string().nullable(),
  headline: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
});

export const LinkPreviewDataSchema = z
  .object({
    title: z.string().nullable(),
    description: z.string().nullable(),
    image: z.string().nullable(),
    domain: z.string(),
  })
  .nullable();

export const PollOptionsSchema = z
  .array(z.object({ label: z.string() }))
  .nullable()
  .optional();

export const BasePostSchema = z.object({
  id: z.string(),
  authorId: z.string().uuid(),
  content: z.string().nullable(),
  hashtags: z.array(z.string()),
  imageUrl: z.string().nullable(),
  // The Post model carries an optional videoUrl column (prisma/schema/feed.prisma);
  // the presenter spreads the row so the field is in the response payload as
  // `null` when unset. Schema needs to declare it so happy-path drift analysis
  // doesn't flag every post as having an extra-field. Previously masked by
  // the contract auth cascade — surfaced once login rate-limit was relaxed.
  videoUrl: z
    .string()
    .nullable()
    .openapi({ example: null, description: 'Optional video attachment URL.' }),
  linkUrl: z.string().nullable(),
  linkPreview: LinkPreviewDataSchema,
  isRepost: z.boolean(),
  originalPostId: z.string().uuid().nullable(),
  scheduledAt: IsoDateTimeSchema.nullable(),
  isPublished: z.boolean(),
  threadId: z.string().uuid().nullable(),
  pollOptions: PollOptionsSchema,
  pollDeadline: IsoDateTimeSchema.nullable(),
  votesCount: z.number().int(),
  codeSnippet: z.string().nullable(),
  codeLanguage: z.string().nullable(),
  likesCount: z.number().int(),
  commentsCount: z.number().int(),
  repostsCount: z.number().int(),
  bookmarksCount: z.number().int(),
  isDeleted: z.boolean(),
  deletedAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export const PostWithAuthorSchema = BasePostSchema.extend({
  author: PostAuthorSchema,
});

export const PostWithRelationsSchema = PostWithAuthorSchema.extend({
  originalPost: PostWithAuthorSchema.nullable().optional(),
});

export const FeedItemSchema = PostWithRelationsSchema.extend({
  isLiked: z.boolean(),
  isBookmarked: z.boolean(),
  isReposted: z.boolean(),
  hasVoted: z.boolean(),
  myVoteIndex: z.number().int().nullable(),
  threadPosts: z.array(PostWithRelationsSchema),
});

export const BookmarkedFeedItemSchema = PostWithRelationsSchema.extend({
  bookmarkedAt: IsoDateTimeSchema,
  isLiked: z.boolean(),
  isBookmarked: z.boolean(),
});

export const FeedTimelineResponseSchema = CursorPaginatedResponseSchema(FeedItemSchema);
export const FeedBookmarksResponseSchema = CursorPaginatedResponseSchema(BookmarkedFeedItemSchema);
export const UserPostsResponseSchema = CursorPaginatedResponseSchema(PostWithRelationsSchema);

// ─── Comments ───────────────────────────────────────────────────────
export const CommentBaseSchema = z.object({
  id: z.string(),
  postId: z.string().uuid(),
  authorId: z.string().uuid(),
  content: z.string(),
  parentId: z.string().uuid().nullable(),
  isDeleted: z.boolean(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export const CommentWithAuthorSchema = CommentBaseSchema.extend({
  author: PostAuthorSchema,
});

export const CommentWithRepliesSchema = CommentWithAuthorSchema.extend({
  replies: z.array(CommentWithAuthorSchema),
});

export const CommentWithPostSchema = CommentWithAuthorSchema.extend({
  post: z.object({
    id: z.string(),
    content: z.string().nullable(),
    authorId: z.string().uuid(),
    author: PostAuthorSchema,
  }),
});

export const CommentsListResponseSchema = CursorPaginatedResponseSchema(CommentWithRepliesSchema);
export const UserCommentsResponseSchema = CursorPaginatedResponseSchema(CommentWithPostSchema);

// ─── Engagement ─────────────────────────────────────────────────────
export const LikePostResponseSchema = z.object({
  postId: z.string().uuid(),
  userId: z.string().uuid(),
  postAuthorId: z.string().uuid().optional(),
  alreadyLiked: z.boolean(),
});

export const UnlikePostResponseSchema = z.object({
  postId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const BookmarkPostResponseSchema = z.object({
  postId: z.string().uuid(),
  userId: z.string().uuid(),
  alreadyBookmarked: z.boolean(),
});

export const UnbookmarkPostResponseSchema = z.object({
  postId: z.string().uuid(),
  userId: z.string().uuid(),
});

// A repost with commentary creates a brand-new post (full author tree);
// without commentary it just records the action. Discriminated on `kind`
// so each variant has an explicit shape in the spec.
export const RepostPostResponseSchema = z.discriminatedUnion('kind', [
  PostWithAuthorSchema.extend({ kind: z.literal('post') }),
  z.object({
    kind: z.literal('reposted'),
    postId: z.string().uuid(),
    userId: z.string().uuid(),
    reposted: z.boolean(),
  }),
]);

export const ReportPostResponseSchema = z.object({
  id: z.string(),
  postId: z.string().uuid(),
  userId: z.string().uuid(),
  reason: z.string(),
  status: z.string(),
  createdAt: IsoDateTimeSchema,
});

export const PollVoteResponseSchema = z.object({
  id: z.string(),
  postId: z.string().uuid(),
  userId: z.string().uuid(),
  optionIndex: z.number().int(),
  createdAt: IsoDateTimeSchema,
});

export const LikeWithPostSchema = z.object({
  postId: z.string().uuid(),
  userId: z.string().uuid(),
  createdAt: IsoDateTimeSchema,
  post: z.object({
    id: z.string(),
    content: z.string().nullable(),
    authorId: z.string().uuid(),
    author: PostAuthorSchema,
  }),
});

export const UserLikesResponseSchema = CursorPaginatedResponseSchema(LikeWithPostSchema);

// ─── Misc ───────────────────────────────────────────────────────────
export const DeletedResponseSchema = z.object({ deleted: z.literal(true) });

export const PostImageUploadResponseSchema = z.object({
  url: z.string(),
  key: z.string(),
});
