import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  ApiResponseDto,
  type DataResponse,
} from '@/bounded-contexts/platform/common/dto/api-response.dto';

extendZodWithOpenApi(z);

export interface ApiDataResponseOptions {
  description?: string;
  status?: number;
}

const PaginatedMetaSchema = z.object({
  total: z.number().openapi({ example: 100 }),
  page: z.number().openapi({ example: 1 }),
  limit: z.number().openapi({ example: 20 }),
  totalPages: z.number().openapi({ example: 5 }),
  hasNextPage: z.boolean().openapi({ example: false }),
  hasPrevPage: z.boolean().openapi({ example: false }),
});

export class PaginatedMetaDto extends createZodDto(PaginatedMetaSchema) {}

type ConstructorType = abstract new (...args: never[]) => object;

const buildModelSchema = (model: ConstructorType) => {
  if (model === Object) {
    return { type: 'object', additionalProperties: true };
  }

  return { $ref: getSchemaPath(model) };
};

export const ApiDataResponse = (
  model: ConstructorType,
  options?: ApiDataResponseOptions,
): MethodDecorator => {
  const status = options?.status ?? HttpStatus.OK;

  return applyDecorators(
    ApiExtraModels(ApiResponseDto, model),
    ApiResponse({
      status,
      description: options?.description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseDto) },
          {
            type: 'object',
            properties: { data: buildModelSchema(model) },
            required: ['data'],
          },
        ],
      },
    }),
  );
};

export const ApiPaginatedDataResponse = (
  model: ConstructorType,
  options?: ApiDataResponseOptions,
): MethodDecorator => {
  const status = options?.status ?? HttpStatus.OK;

  return applyDecorators(
    ApiExtraModels(ApiResponseDto, PaginatedMetaDto, model),
    ApiResponse({
      status,
      description: options?.description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseDto) },
          {
            type: 'object',
            properties: {
              data: { type: 'array', items: buildModelSchema(model) },
              meta: { $ref: getSchemaPath(PaginatedMetaDto) },
            },
            required: ['data', 'meta'],
          },
        ],
      },
    }),
  );
};

export const ApiEmptyDataResponse = (options?: ApiDataResponseOptions): MethodDecorator => {
  const status = options?.status ?? HttpStatus.OK;

  // 204 No Content should not have a response body
  if (status === HttpStatus.NO_CONTENT) {
    return applyDecorators(ApiResponse({ status, description: options?.description }));
  }

  return applyDecorators(
    ApiExtraModels(ApiResponseDto),
    ApiResponse({
      status,
      description: options?.description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseDto) },
          {
            type: 'object',
            properties: {
              data: { type: 'null', nullable: true },
            },
          },
        ],
      },
    }),
  );
};

export type DataResponseOf<TData> = DataResponse<TData>;

// --- Streaming / Binary Response Decorators ---

export interface ApiStreamResponseOptions {
  description?: string;
  mimeType:
    | 'application/pdf'
    | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    | 'application/zip'
    | 'image/png'
    | 'application/octet-stream'
    | 'text/plain';
  filename?: string;
}

/**
 * Decorator for endpoints that return StreamableFile (binary streams).
 * Does not wrap in DataResponse — streams are returned directly.
 *
 * Usage:
 *   @ApiStreamResponse({ mimeType: 'application/pdf', description: 'PDF document' })
 *   async exportPdf(): Promise<StreamableFile> { ... }
 */
export const ApiStreamResponse = (options: ApiStreamResponseOptions): MethodDecorator => {
  return applyDecorators(
    ApiResponse({
      status: HttpStatus.OK,
      description: options.description,
      content: {
        [options.mimeType]: {
          schema: { type: 'string', format: 'binary' },
        },
      },
    }),
  );
};
