/**
 * Enum Response DTOs
 *
 * Exposes domain enums in swagger for frontend SDK generation.
 * These DTOs ensure enums appear in the generated OpenAPI spec.
 *
 * NOTE: Section types are NOT hardcoded here - they come from the
 * SectionType table in the database (generic sections model).
 * Use the /v1/section-types endpoint to list available section types.
 */

import { ApiProperty } from '@nestjs/swagger';

/**
 * Export format enum response for swagger documentation
 */
export class ExportFormatResponseDto {
  @ApiProperty({
    enum: ['PDF', 'DOCX', 'JSON'],
    description: 'Available export formats',
    example: 'PDF',
  })
  format!: 'PDF' | 'DOCX' | 'JSON';
}

/**
 * User role enum response for swagger documentation
 */
export class UserRoleResponseDto {
  @ApiProperty({
    enum: ['USER', 'ADMIN', 'APPROVER'],
    description: 'Available user roles',
    example: 'USER',
  })
  role!: 'USER' | 'ADMIN' | 'APPROVER';
}
