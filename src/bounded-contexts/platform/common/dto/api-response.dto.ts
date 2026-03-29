import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Standard API Response wrapper
 * All API responses should follow this structure for consistency
 */
export class ApiResponseDto<T = undefined> {
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
export type ApiMessageResponse = ApiResponseDto<undefined>;
export type DataResponse<T> = ApiResponseDto<T>;
export type PaginatedResponse<T> = ApiResponseDto<T[]>;
