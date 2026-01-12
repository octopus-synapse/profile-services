/**
 * Common Validation Schemas
 *
 * Re-exports from @octopus-synapse/profile-contracts.
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
} from '@octopus-synapse/profile-contracts';

// For backwards compatibility with existing code
export type Reorder = { ids: string[] };
