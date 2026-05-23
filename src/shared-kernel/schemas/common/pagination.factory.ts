/**
 * Pagination schema factory with a typed sortBy allowlist (P1 #34).
 *
 * The default `PaginationQuerySchema` accepts `sortBy: z.string().optional()`
 * because there's no way to know — from the shared-kernel level — which
 * columns each route is willing to sort on. That's a foot-gun: a caller
 * can ship `?sortBy=arbitraryColumn`, the schema validates, and the
 * route either explodes at the DB level or worse, silently composes
 * the string into an ORDER BY clause.
 *
 * Use `makePaginationSchema(['col1', 'col2'])` per route to declare
 * the exact allowlist. Requests with an unknown `sortBy` get a 400
 * before reaching the use case, and the SDK types narrow to the
 * literal union so the frontend gets autocomplete + compile errors
 * for typos.
 *
 * The output shape mirrors `PaginationQuerySchema` exactly (page,
 * limit, sortBy, sortOrder) so existing handlers don't have to
 * change their consumer code.
 */

import { z } from 'zod';
import { LimitSchema, PageSchema } from '../primitives/pagination.schema';

export function makePaginationSchema<const TAllowed extends readonly [string, ...string[]]>(
  allowedSortFields: TAllowed,
) {
  return z.object({
    page: PageSchema,
    limit: LimitSchema,
    sortBy: z.enum(allowedSortFields).optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  });
}

export type PaginationSortField<
  TSchema extends ReturnType<typeof makePaginationSchema<readonly [string, ...string[]]>>,
> = NonNullable<z.infer<TSchema>['sortBy']>;
