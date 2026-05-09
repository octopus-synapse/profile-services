import { z } from 'zod';

export const ApiResponseSchema = z.object({
  success: z.boolean().describe('Indicates if the operation was successful'),
  message: z.string().optional().describe('Response message'),
  data: z.unknown().optional().describe('Response data'),
  meta: z.record(z.string(), z.unknown()).optional().describe('Additional metadata'),
});
/**
 * Type aliases for common response patterns
 */
export interface ApiResponseDto<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: Record<string, unknown>;
}

export type ApiMessageResponse = ApiResponseDto<undefined>;
export type DataResponse<T> = ApiResponseDto<T>;
export type PaginatedResponse<T> = ApiResponseDto<T[]>;
