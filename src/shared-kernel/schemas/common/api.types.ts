import { z } from 'zod';
import { LimitSchema, PageSchema } from '../primitives/pagination.schema';

/**
 * API Response Types
 *
 * Generic wrapper types for API responses.
 * Ensures consistent response structure across all endpoints.
 */

/**
 * Error Response Schema
 *
 * Body shape for any non-2xx response. The HTTP status carries "error";
 * no `success: false` flag. `severity` is a UX hint ('toast'|'modal'|'banner'|'inline'|'silent').
 */
export const ErrorResponseSchema = z.object({
  statusCode: z.number().int(),
  code: z.string(),
  message: z.string(),
  severity: z.enum(['toast', 'modal', 'banner', 'inline', 'silent']),
  suggestedAction: z
    .object({
      label: z.string(),
      href: z.string().optional(),
      eventName: z.string().optional(),
    })
    .optional(),
  params: z.record(z.unknown()).optional(),
  fields: z
    .array(
      z.object({
        path: z.array(z.union([z.string(), z.number()])),
        code: z.string(),
        params: z.record(z.unknown()).optional(),
        message: z.string(),
      }),
    )
    .optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

/**
 * Paginated Response Schema (offset-based, canonical)
 *
 * Single official shape for offset pagination across the API. Renamed
 * `hasPrevious → hasPrev` for symmetry with `hasNext`.
 */
export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    totalPages: z.number().int().min(0),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  });

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

/**
 * Cursor Paginated Response Schema
 *
 * Used by feed, chat, notifications and any infinite-scroll list where
 * the backend doesn't compute `total`. `nextCursor` is `null` when the
 * end of the list has been reached.
 */
export const CursorPaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    nextCursor: z.string().nullable(),
    hasNext: z.boolean(),
  });

export type CursorPaginatedResponse<T> = {
  items: T[];
  nextCursor: string | null;
  hasNext: boolean;
};

/**
 * Migration alias: legacy callers imported `PaginatedResult` from
 * `@/shared-kernel`. Same shape as `PaginatedResponse` after the T4
 * migration; kept as a type-only alias to avoid touching every importer.
 */
export type PaginatedResult<T> = PaginatedResponse<T>;

/**
 * Pagination Query Schema. Composes the canonical `PageSchema` and
 * `LimitSchema` primitives so a single change to either ripples
 * everywhere via the SDK regen.
 */
export const PaginationQuerySchema = z.object({
  page: PageSchema,
  limit: LimitSchema,
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
