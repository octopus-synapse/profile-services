/**
 * Domain shapes for feed posts. Mirrors the Prisma rows used by the
 * application layer without forcing use cases / services to import
 * Prisma types directly.
 *
 * `data`, `linkPreview`, and `codeSnippet` are kept as `unknown` so the
 * domain layer stays free of Prisma's `Json` / `InputJsonValue` types;
 * adapters cast at the boundary.
 */

import type { AnonymousCategory, PostType, ReactionType } from '@prisma/client';

export type { AnonymousCategory, PostType, ReactionType };

/** Author fields denormalised onto post views for the UI. */
export interface PostAuthor {
  readonly id: string;
  readonly name: string | null;
  readonly username: string | null;
  readonly photoURL: string | null;
  readonly bio?: string | null;
  readonly location?: string | null;
}

/** Persisted post row. */
export interface Post {
  readonly id: string;
  readonly authorId: string;
  readonly type: PostType;
  readonly subtype: string | null;
  readonly content: string | null;
  readonly hardSkills: string[];
  readonly softSkills: string[];
  readonly hashtags: string[];
  readonly data: unknown;
  readonly imageUrl: string | null;
  readonly linkUrl: string | null;
  readonly linkPreview: unknown;
  readonly originalPostId: string | null;
  readonly coAuthors: string[];
  readonly scheduledAt: Date | null;
  readonly isPublished: boolean;
  readonly threadId: string | null;
  readonly pollDeadline: Date | null;
  readonly votesCount: number;
  readonly codeSnippet: unknown;
  readonly likesCount: number;
  readonly commentsCount: number;
  readonly repostsCount: number;
  readonly bookmarksCount: number;
  readonly isDeleted: boolean;
  readonly deletedAt: Date | null;
  readonly isAnonymous: boolean;
  readonly anonymousCategory: AnonymousCategory | null;
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
  readonly type: PostType;
  readonly subtype?: string;
  readonly content?: string;
  readonly hardSkills?: string[];
  readonly softSkills?: string[];
  readonly data?: unknown;
  readonly imageUrl?: string;
  readonly linkUrl?: string;
  readonly linkPreview?: unknown;
  readonly originalPostId?: string;
  readonly coAuthors?: string[];
  readonly scheduledAt?: string;
  readonly threadId?: string;
  readonly codeSnippet?: { language: string; code: string; filename?: string };
  readonly isAnonymous?: boolean;
  readonly anonymousCategory?: 'SALARY' | 'INTERVIEW' | 'LAYOFF' | 'TOXIC_CULTURE' | 'HARASSMENT';
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
  readonly type?: PostType;
  readonly followingOnly: boolean;
}
