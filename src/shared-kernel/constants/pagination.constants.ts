export const PAGINATION = {
 DEFAULT_PAGE: 1,
 DEFAULT_PAGE_SIZE: 20,
 MIN_PAGE_SIZE: 5,
 MAX_PAGE_SIZE: 100,
 DEFAULT_SORT_ORDER: "desc" as const,
} as const;

export type SortOrder = "asc" | "desc";
export const SORT_ORDERS: readonly SortOrder[] = ["asc", "desc"] as const;
