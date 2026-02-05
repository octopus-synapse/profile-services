import { z } from "zod";

/**
 * API Response Types
 *
 * Generic wrapper types for API responses.
 * Ensures consistent response structure across all endpoints.
 */

/**
 * Success Response Schema
 * Standard wrapper for successful API responses
 */
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
 z.object({
  success: z.literal(true),
  data: dataSchema,
  message: z.string().optional(),
 });

export type ApiResponse<T> = {
 success: true;
 data: T;
 message?: string;
};

/**
 * Error Response Schema
 */
export const ApiErrorResponseSchema = z.object({
 success: z.literal(false),
 error: z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
 }),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

/**
 * Paginated Response Schema
 */
export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(
 itemSchema: T
) =>
 z.object({
  items: z.array(itemSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  totalPages: z.number().int().min(0),
  hasNext: z.boolean(),
  hasPrevious: z.boolean(),
 });

export type PaginatedResponse<T> = {
 items: T[];
 total: number;
 page: number;
 limit: number;
 totalPages: number;
 hasNext: boolean;
 hasPrevious: boolean;
};

/**
 * Pagination Query Schema
 */
export const PaginationQuerySchema = z.object({
 page: z.coerce.number().int().min(1).default(1),
 limit: z.coerce.number().int().min(1).max(100).default(20),
 sortBy: z.string().optional(),
 sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

/**
 * Paginated Result Schema (Alternative format for data[] structure)
 * Used by resume sub-resource endpoints
 */
export const PaginatedResultSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
 z.object({
  data: z.array(dataSchema),
  meta: z.object({
   total: z.number().int().min(0),
   page: z.number().int().min(1),
   limit: z.number().int().min(1),
   totalPages: z.number().int().min(0),
   hasNextPage: z.boolean(),
   hasPrevPage: z.boolean(),
  }),
 });

export type PaginatedResult<T> = {
 data: T[];
 meta: {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
 };
};
