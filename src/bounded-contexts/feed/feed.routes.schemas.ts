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
  type: z.nativeEnum(PostType).optional(),
  followingOnly: z.string().optional(),
});

export const LikeBodySchema = z
  .object({
    reactionType: z
      .enum(['LIKE', 'CELEBRATE', 'LOVE', 'INSIGHTFUL', 'CURIOUS'] as const)
      .optional(),
  })
  .openapi({
    example: {
      reactionType: 'LIKE',
    },
  });

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
  maxImages: 4,
  maxImageBytes: 5 * 1024 * 1024,
  pollEnabled: true,
  pollMaxOptions: 4,
  pollMaxOptionLength: 80,
  repostEnabled: true,
  mentionLimit: 10,
  postTypes: Object.values(PostType),
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
  postTypes: z.array(z.nativeEnum(PostType)),
});

// ─── Shared post-shape schemas ────────────────────────────────────────
//
// These mirror the domain entities from `domain/entities/*`. The post
// `data`, `linkPreview`, and `codeSnippet` columns are persisted as
// JSON; we expose them as permissive `passthrough()` objects so
// arbitrary structured payloads round-trip without losing fields.

export const PostAuthorSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  photoURL: z.string().nullable(),
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

export const CodeSnippetSchema = z
  .object({
    language: z.string(),
    code: z.string(),
    filename: z.string().optional(),
  })
  .nullable();

export const PostDataSchema = z.object({}).passthrough().nullable(); // lint-allow-passthrough: post data shape varies per PostType and is validated by the discriminated union in the use case.

export const BasePostSchema = z.object({
  id: z.string(),
  authorId: z.string().uuid(),
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
  originalPostId: z.string().uuid().nullable(),
  coAuthors: z.array(z.string()),
  scheduledAt: IsoDateTimeSchema.nullable(),
  isPublished: z.boolean(),
  threadId: z.string().uuid().nullable(),
  pollDeadline: IsoDateTimeSchema.nullable(),
  votesCount: z.number().int(),
  codeSnippet: CodeSnippetSchema,
  likesCount: z.number().int(),
  commentsCount: z.number().int(),
  repostsCount: z.number().int(),
  bookmarksCount: z.number().int(),
  isDeleted: z.boolean(),
  deletedAt: IsoDateTimeSchema.nullable(),
  isAnonymous: z.boolean(),
  anonymousCategory: z.nativeEnum(AnonymousCategory).nullable(),
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
  reactionType: z.nativeEnum(ReactionType).nullable(),
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
    type: z.string(),
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
  reactionType: z.nativeEnum(ReactionType),
  postAuthorId: z.string().uuid().optional(),
  alreadyLiked: z.boolean(),
  updated: z.boolean().optional(),
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

export const ReactionWithPostSchema = z.object({
  postId: z.string().uuid(),
  userId: z.string().uuid(),
  reactionType: z.nativeEnum(ReactionType),
  createdAt: IsoDateTimeSchema,
  post: z.object({
    id: z.string(),
    type: z.string(),
    content: z.string().nullable(),
    authorId: z.string().uuid(),
    author: PostAuthorSchema,
  }),
});

export const UserReactionsResponseSchema = CursorPaginatedResponseSchema(ReactionWithPostSchema);

// ─── Misc ───────────────────────────────────────────────────────────
export const DeletedResponseSchema = z.object({ deleted: z.literal(true) });

export const PostImageUploadResponseSchema = z.object({
  url: z.string(),
  key: z.string(),
});
