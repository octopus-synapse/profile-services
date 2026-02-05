/**
 * Common Validation Schemas
 *
 * Re-exports from @/shared-kernel.
 * Single source of truth for common validation patterns.
 */

// Pagination and Reorder
export {
  PaginationQuerySchema as paginationQuerySchema,
  type PaginationQuery,
  ReorderItemsSchema as reorderItemsSchema,
  type ReorderItems,
  DateStringSchema as dateStringSchema,
  type DateString,
  IdParamSchema as idParamSchema,
  type IdParam,
  SearchQuerySchema as searchQuerySchema,
  type SearchQuery,
} from '@/shared-kernel';

// For backwards compatibility with existing code
export type Reorder = { ids: string[] };
