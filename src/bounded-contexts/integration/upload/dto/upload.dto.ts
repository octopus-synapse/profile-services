/**
 * Upload DTOs — Zod-first.
 *
 * Response payloads are Zod schemas. Multipart `file` fields are described
 * via `extendZodWithOpenApi`'s `.openapi({ format: 'binary' })` so the
 * OpenAPI document still advertises a binary upload field.
 */

import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

extendZodWithOpenApi(z);

// ============================================================================
// Response Schemas
// ============================================================================

const UploadResponseSchema = z.object({
  url: z.string().url().describe('Full URL to the uploaded file'),
  key: z.string().describe('S3 key/path of the uploaded file'),
});

const DeleteResponseSchema = z.object({
  deleted: z.boolean().describe('Whether the file was successfully deleted'),
});

// ============================================================================
// Response DTOs
// ============================================================================

export class UploadResponseDto extends createZodDto(UploadResponseSchema) {}
export class DeleteResponseDto extends createZodDto(DeleteResponseSchema) {}

// ============================================================================
// Request DTOs (multipart/form-data file uploads)
// ============================================================================

const ProfileImageUploadSchema = z.object({
  file: z.any().openapi({
    type: 'string',
    format: 'binary',
    description: 'The profile image file to upload (JPEG, PNG, WebP)',
  }),
});

const CompanyLogoUploadSchema = z.object({
  file: z.any().openapi({
    type: 'string',
    format: 'binary',
    description: 'The company logo file to upload (JPEG, PNG, WebP, SVG)',
  }),
});

export class UploadProfileImageRequestDto extends createZodDto(ProfileImageUploadSchema) {}
export class UploadCompanyLogoRequestDto extends createZodDto(CompanyLogoUploadSchema) {}
