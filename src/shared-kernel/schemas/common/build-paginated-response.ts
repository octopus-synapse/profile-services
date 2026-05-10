import type { PaginatedResponse } from './api.types';

/**
 * Wrap a `{items, total}` repository result with the canonical
 * paginated response envelope (computes `totalPages`, `hasNext`,
 * `hasPrev`).
 *
 * Use this for routes that are **truly paginated** — the service has a
 * `total` independent of the page slice, and the caller passes
 * `{page, limit}` they used to query. Eliminates the per-service
 * repetition of those three computations that landed in the
 * social/jobs/feed pagination sweep (Q1).
 *
 * For routes that return every item in a single response (no pagination
 * server-side — user skills, role catalog), use `buildFixedListResponse`
 * instead.
 */
export function buildPaginatedResponse<T>(
  items: T[],
  total: number,
  pagination: { page: number; limit: number },
): PaginatedResponse<T> {
  const { page, limit } = pagination;
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    items,
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Wrap a fixed-size list (no server-side pagination) in the canonical
 * `PaginatedResponse<T>` envelope so frontend consumers (`useInfiniteList`,
 * `Page<T>` plumbing) work the same way for paginated and fixed routes.
 *
 * Synthetic values: `total = items.length`, `page = 1`, `limit =
 * max(items.length, 1)`, `totalPages = items.length === 0 ? 0 : 1`,
 * `hasNext = hasPrev = false`.
 *
 * Use this for routes whose service returns the full list in one shot
 * — user skills (fixed small set per user), persona catalog, role
 * catalog, etc. For truly paginated routes (services with a separate
 * `total` and `{page, limit}` query input), use
 * `buildPaginatedResponse`.
 */
export function buildFixedListResponse<T>(items: T[]): PaginatedResponse<T> {
  const total = items.length;
  return {
    items,
    total,
    page: 1,
    limit: Math.max(total, 1),
    totalPages: total === 0 ? 0 : 1,
    hasNext: false,
    hasPrev: false,
  };
}
