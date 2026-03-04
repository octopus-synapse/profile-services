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
 * Type aliases for common response patterns
 */
export type MessageResponse = ApiResponse<undefined>;
export type DataResponse<T> = ApiResponse<T>;
export type PaginatedResponse<T> = ApiResponse<T[]>;
