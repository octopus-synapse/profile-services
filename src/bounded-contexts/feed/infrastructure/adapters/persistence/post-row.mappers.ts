/**
 * Shared Prisma-row → domain mappers for the feed `Post` aggregate.
 *
 * The feed and engagement repositories both read posts with the same
 * author/relations includes and must narrow the JSON columns the same
 * way. Centralising the include shapes + mappers here keeps the
 * narrowing in one tested place instead of a double-cast per query site.
 *
 * The only fields that diverge from the generated row type are the JSON
 * columns: the domain treats `linkPreview` as `unknown` (assignable from
 * `JsonValue` for free) and `pollOptions` as the parsed `PollOption[]`.
 */

import type { Prisma } from '@prisma/client';
import type { PollOption, PostWithAuthor, PostWithRelations } from '../../../domain/entities';

export const AUTHOR_SELECT = {
  id: true,
  name: true,
  username: true,
  photoURL: true,
  headline: true,
  bio: true,
  location: true,
} as const;

export const POST_WITH_AUTHOR_INCLUDE = { author: { select: AUTHOR_SELECT } } as const;
export const POST_WITH_RELATIONS_INCLUDE = {
  author: { select: AUTHOR_SELECT },
  originalPost: { include: { author: { select: AUTHOR_SELECT } } },
} as const;

export type PostWithAuthorRow = Prisma.PostGetPayload<{ include: typeof POST_WITH_AUTHOR_INCLUDE }>;
export type PostWithRelationsRow = Prisma.PostGetPayload<{
  include: typeof POST_WITH_RELATIONS_INCLUDE;
}>;

export function toPostWithAuthor(row: PostWithAuthorRow): PostWithAuthor {
  return { ...row, pollOptions: row.pollOptions as PollOption[] | null };
}

export function toPostWithRelations(row: PostWithRelationsRow): PostWithRelations {
  return {
    ...row,
    pollOptions: row.pollOptions as PollOption[] | null,
    originalPost: row.originalPost ? toPostWithAuthor(row.originalPost) : null,
  };
}
