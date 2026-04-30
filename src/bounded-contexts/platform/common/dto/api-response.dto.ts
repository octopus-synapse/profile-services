/**
 * Standard API Response wrapper — Zod-first.
 *
 * The `ApiResponseDto` class is preserved (still consumed by
 * `api-data-response.decorator.ts`) but is now a Zod-derived shape via
 * `createZodDto`. The generic `<T>` is intentionally erased at runtime —
 * the wrapper schema only documents the envelope; the `data` slot is
 * filled in per-endpoint by the response decorators.
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ApiResponseSchema = z.object({
  success: z.boolean().describe('Indicates if the operation was successful'),
  message: z.string().optional().describe('Response message'),
  data: z.unknown().optional().describe('Response data'),
  meta: z.record(z.string(), z.unknown()).optional().describe('Additional metadata'),
});

/**
 * Generic-friendly type. The schema-bound class below carries the OpenAPI
 * envelope; the `<T>` parameter is purely a TypeScript convenience so
 * `DataResponse<MyDto>` keeps the right `data` type at compile time.
 */
export class ApiResponseDto<T = undefined> extends createZodDto(ApiResponseSchema) {
  declare data?: T;
}

/**
 * Type aliases for common response patterns
 */
export type ApiMessageResponse = ApiResponseDto<undefined>;
export type DataResponse<T> = ApiResponseDto<T>;
export type PaginatedResponse<T> = ApiResponseDto<T[]>;
