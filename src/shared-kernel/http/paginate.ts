/**
 * Pagination helper. Centralises the math so use-cases never compute
 * `totalPages/hasNext/hasPrev` by hand. Pair with `PaginatedResponseSchema`
 * for the canonical offset shape.
 */

import type { PaginatedResponse } from '@/shared-kernel/schemas/common/api.types';

export function paginate<T>(
  items: readonly T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.max(1, Math.floor(limit));
  const totalPages = safeLimit === 0 ? 0 : Math.ceil(total / safeLimit);
  return {
    items: [...items],
    total,
    page: safePage,
    limit: safeLimit,
    totalPages,
    hasNext: safePage * safeLimit < total,
    hasPrev: safePage > 1,
  };
}
