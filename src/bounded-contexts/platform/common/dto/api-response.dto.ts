import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Standard API Response wrapper
 * All API responses should follow this structure for consistency
 */
export class ApiResponse<T = undefined> {
  @ApiProperty({ description: 'Indicates if the operation was successful' })
  success: boolean;

  @ApiPropertyOptional({ description: 'Response message' })
  message?: string;

  @ApiPropertyOptional({ description: 'Response data' })
  data?: T;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  meta?: Record<string, unknown>;
}

/**
 * Helper functions to create standardized API responses
 */
export const ApiResponseHelper = {
  /**
   * Create a success response with data
   */
  success<T>(data: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      ...(message && { message }),
      data,
    };
  },

  /**
   * Create a success response with just a message (no data)
   */
  message(message: string): ApiResponse {
    return {
      success: true,
      message,
    };
  },

  /**
   * Create a success response with data and metadata
   */
  withMeta<T>(data: T, meta: Record<string, unknown>, message?: string): ApiResponse<T> {
    return {
      success: true,
      ...(message && { message }),
      data,
      meta,
    };
  },

  /**
   * Create a paginated response
   */
  paginated<T>(
    data: T[],
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    },
  ): ApiResponse<T[]> {
    return {
      success: true,
      data,
      meta: pagination,
    };
  },

  /**
   * Create a count response (for bulk operations)
   */
  count(count: number, message?: string): ApiResponse<{ count: number }> {
    return {
      success: true,
      ...(message && { message }),
      data: { count },
    };
  },
};

/**
 * Type aliases for common response patterns
 */
export type MessageResponse = ApiResponse<undefined>;
export type DataResponse<T> = ApiResponse<T>;
export type PaginatedResponse<T> = ApiResponse<T[]>;
