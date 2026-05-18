export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MIN_PAGE_SIZE: 5,
  MAX_PAGE_SIZE: 100,
  // P2-#10: cap deep-pagination. Without an upper bound a request like
  // `?page=999999&limit=100` would issue `OFFSET 99999900` to Postgres,
  // forcing a full-table scan. 1000 is comfortably beyond any UI surface
  // and the cursor-based feeds avoid the issue entirely.
  MAX_PAGE: 1000,
  DEFAULT_SORT_ORDER: 'desc' as const,
} as const;

export type SortOrder = 'asc' | 'desc';
export const SORT_ORDERS: readonly SortOrder[] = ['asc', 'desc'] as const;
