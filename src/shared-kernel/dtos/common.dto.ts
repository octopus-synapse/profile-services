/**
 * Common DTOs
 *
 * Shared utility schemas used across multiple modules.
 * Single source of truth for pagination, reordering, and common patterns.
 */

import { z } from "zod";

// Re-export pagination from types (avoid duplication)
export {
 PaginationQuerySchema,
 type PaginationQuery,
} from "../types/api.types";

/**
 * Reorder Items Schema
 * Used for drag-and-drop reordering of list items.
 */
export const ReorderItemsSchema = z.object({
 ids: z.array(z.string().min(1)).min(1, "At least one ID is required"),
});

export type ReorderItems = z.infer<typeof ReorderItemsSchema>;

/**
 * Date String Schema
 * Accepts YYYY-MM-DD or YYYY-MM format.
 */
export const DateStringSchema = z
 .string()
 .regex(
  /^\d{4}-\d{2}(-\d{2})?$/,
  "Invalid date format (YYYY-MM or YYYY-MM-DD)"
 );

export type DateString = z.infer<typeof DateStringSchema>;

/**
 * ID Parameter Schema
 * Used for route parameters requiring a valid CUID.
 */
export const IdParamSchema = z.object({
 id: z.string().min(1, "ID is required"),
});

export type IdParam = z.infer<typeof IdParamSchema>;

/**
 * Search Query Schema
 * Used for search endpoints with optional filters.
 */
export const SearchQuerySchema = z.object({
 query: z.string().max(200).optional(),
 page: z.coerce.number().int().min(1).default(1),
 limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;
