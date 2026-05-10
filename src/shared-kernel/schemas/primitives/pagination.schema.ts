import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { PAGINATION } from '@/shared-kernel/constants/pagination.constants';

extendZodWithOpenApi(z);

/**
 * Pagination primitives.
 *
 * Routes never redeclare `z.coerce.number().int().min(1)...` for page,
 * limit, pageSize, or cursor. They import these and the contract
 * (description + bounds + format) is one source of truth.
 *
 * - `PageSchema`: 1-indexed page number, integer ≥ 1.
 * - `LimitSchema`: items-per-page, integer 1..MAX_PAGE_SIZE (100).
 * - `CursorSchema`: opaque pagination token, string.
 *
 * Routes that take both page+limit (offset pagination) should reuse
 * `PaginationQuerySchema` from `../common/api.types.ts` rather than
 * composing these manually — that schema already binds the canonical
 * combo plus `sortBy`/`sortOrder`. Use the individual primitives only
 * when the route's query shape genuinely differs (cursor + limit, or
 * limit alone).
 */

export const PageSchema = z.coerce
  .number()
  .int()
  .min(1, 'page must be a positive integer')
  .default(PAGINATION.DEFAULT_PAGE)
  .openapi('Page', {
    description: '1-indexed page number for offset pagination.',
    example: PAGINATION.DEFAULT_PAGE,
  });

export type Page = z.infer<typeof PageSchema>;

export const LimitSchema = z.coerce
  .number()
  .int()
  .min(1, 'limit must be a positive integer')
  .max(PAGINATION.MAX_PAGE_SIZE, `limit cannot exceed ${PAGINATION.MAX_PAGE_SIZE}`)
  .default(PAGINATION.DEFAULT_PAGE_SIZE)
  .openapi('Limit', {
    description: `Items per page (max ${PAGINATION.MAX_PAGE_SIZE}).`,
    example: PAGINATION.DEFAULT_PAGE_SIZE,
  });

export type Limit = z.infer<typeof LimitSchema>;

export const CursorSchema = z.string().openapi('Cursor', {
  description:
    'Opaque pagination cursor returned by the previous response. The shape and contents are server-private; clients pass it back unchanged.',
});

export type Cursor = z.infer<typeof CursorSchema>;
