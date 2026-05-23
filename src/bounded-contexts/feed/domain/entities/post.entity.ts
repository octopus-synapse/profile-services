/**
 * Domain shapes for feed posts. Mirrors the Prisma rows used by the
 * application layer without forcing use cases / services to import
 * Prisma types directly.
 *
 * `linkPreview` is kept as `unknown` so the domain layer stays free of
 * Prisma's `Json` / `InputJsonValue` types; adapters cast at the boundary.
 */

/** Author fields denormalised onto post views for the UI. */
export interface PostAuthor {
  readonly id: string;
  readonly name: string | null;
  readonly username: string | null;
  readonly photoURL: string | null;
  readonly headline?: string | null;
  readonly bio?: string | null;
  readonly location?: string | null;
}

/** Poll option label stored as JSON array on `Post.pollOptions`. */
export interface PollOption {
  readonly label: string;
}

/** Persisted post row. */
export interface Post {
  readonly id: string;
  readonly authorId: string;
  readonly content: string | null;
  readonly hashtags: string[];
  readonly imageUrl: string | null;
  readonly linkUrl: string | null;
  readonly linkPreview: unknown;
  readonly isRepost: boolean;
  readonly originalPostId: string | null;
  readonly scheduledAt: Date | null;
  readonly isPublished: boolean;
  readonly threadId: string | null;
  readonly pollOptions: PollOption[] | null;
  readonly pollDeadline: Date | null;
  readonly votesCount: number;
  readonly codeSnippet: string | null;
  readonly codeLanguage: string | null;
  readonly likesCount: number;
  readonly commentsCount: number;
  readonly repostsCount: number;
  readonly bookmarksCount: number;
  readonly isDeleted: boolean;
  readonly deletedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** Post + denormalised author. */
export interface PostWithAuthor extends Post {
  readonly author: PostAuthor;
}

/** Post + denormalised author + optional original (for reposts). */
export interface PostWithRelations extends PostWithAuthor {
  readonly originalPost?: PostWithAuthor | null;
}

/** Fields accepted when creating a post. */
export interface CreatePostInput {
  readonly content?: string;
  readonly imageUrl?: string;
  readonly linkUrl?: string;
  readonly linkPreview?: unknown;
  readonly isRepost?: boolean;
  readonly originalPostId?: string;
  readonly scheduledAt?: string;
  readonly threadId?: string;
  readonly pollOptions?: PollOption[];
  readonly pollDeadline?: string;
  readonly codeSnippet?: string;
  readonly codeLanguage?: string;
}

/** Repository-level shape: same as `CreatePostInput` plus the parsed
 * hashtags + computed `isPublished` flag. Use cases pre-compute these
 * so adapters stay dumb. */
export interface PersistPostInput extends CreatePostInput {
  readonly hashtags: string[];
  readonly isPublished: boolean;
  readonly scheduledAt?: string;
}

/** Filter shape accepted by feed timeline / bookmarks queries. */
export interface FeedQuery {
  readonly userId: string;
  readonly cursor?: string;
  readonly limit: number;
  readonly followingOnly: boolean;
}
