/**
 * Common Validation Schemas
 *
 * Re-exports from @/shared-kernel.
 * Single source of truth for common validation patterns.
 */

// Pagination and Reorder
export {
  type DateString,
  DateStringSchema as dateStringSchema,
  type IdParam,
  IdParamSchema as idParamSchema,
  type PaginationQuery,
  PaginationQuerySchema as paginationQuerySchema,
  type ReorderItems,
  ReorderItemsSchema as reorderItemsSchema,
  type SearchQuery,
  SearchQuerySchema as searchQuerySchema,
} from '@/shared-kernel';

// For backwards compatibility with existing code
export type Reorder = { ids: string[] };
