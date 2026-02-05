/**
 * Enum Response DTOs
 *
 * Exposes domain enums in swagger for frontend SDK generation.
 * These DTOs ensure enums appear in the generated OpenAPI spec.
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
  format: 'PDF' | 'DOCX' | 'JSON';
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
  role: 'USER' | 'ADMIN' | 'APPROVER';
}
