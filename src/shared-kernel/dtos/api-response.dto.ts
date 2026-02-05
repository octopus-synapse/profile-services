/**
 * API Response DTOs
 *
 * Standard API response wrapper types for consistency across the platform.
 * All API responses should follow these structures.
 */

import { z } from 'zod';

// ============================================================================
// Base API Response
// ============================================================================

export const BaseApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    message: z.string().optional(),
    data: dataSchema.optional(),
    meta: z.record(z.unknown()).optional(),
  });

/**
 * Generic API Response type
 */
export interface BaseApiResponse<T = undefined> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: Record<string, unknown>;
}

// ============================================================================
// Pagination Meta
// ============================================================================

export const PaginationMetaSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

// ============================================================================
// Type Aliases for Common Patterns
// ============================================================================

export type BaseMessageResponse = BaseApiResponse<undefined>;
export type DataResponseWrapper<T> = BaseApiResponse<T>;
export type PaginatedDataResponse<T> = BaseApiResponse<T[]>;

// ============================================================================
// Response Envelope (for consistent API responses)
// ============================================================================

export const SuccessEnvelopeSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
});

export type SuccessEnvelope = z.infer<typeof SuccessEnvelopeSchema>;

export const ErrorEnvelopeSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  error: z.string().optional(),
  statusCode: z.number().int().optional(),
});

export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;

// ============================================================================
// Count Response (for bulk operations)
// ============================================================================

export const CountResponseSchema = z.object({
  count: z.number().int().nonnegative(),
});

export type CountResponse = z.infer<typeof CountResponseSchema>;
