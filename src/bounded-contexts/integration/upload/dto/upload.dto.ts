/**
 * Upload DTOs
 *
 * Data Transfer Objects for file upload API.
 * Using createZodDto for response schemas and ApiProperty for file uploads.
 */

import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

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
// Request DTOs (for multipart/form-data file uploads)
// These use @ApiProperty for proper Swagger binary format documentation
// ============================================================================

export class UploadProfileImageRequestDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'The profile image file to upload (JPEG, PNG, WebP)',
  })
  file: Express.Multer.File;
}

export class UploadCompanyLogoRequestDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'The company logo file to upload (JPEG, PNG, WebP, SVG)',
  })
  file: Express.Multer.File;
}
