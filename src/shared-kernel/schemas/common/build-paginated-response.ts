import type { PaginatedResponse } from './api.types';

/**
 * Wrap a `{items, total}` repository result with the canonical
 * paginated response envelope (computes `totalPages`, `hasNext`,
 * `hasPrev`).
 *
 * Eliminates the per-service repetition of those three computations
 * that landed in the social/jobs/feed pagination sweep (Q1).
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
