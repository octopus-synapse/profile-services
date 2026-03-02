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

/**
 * Resume section type enum values
 */
export const SECTION_TYPE_VALUES = [
  'experience',
  'education',
  'skills',
  'projects',
  'languages',
  'certifications',
  'interests',
  'references',
  'volunteer',
  'awards',
  'publications',
  'summary',
  'custom',
] as const;

export type SectionType = (typeof SECTION_TYPE_VALUES)[number];

/**
 * Section type enum response for swagger documentation
 */
export class SectionTypeResponseDto {
  @ApiProperty({
    enum: SECTION_TYPE_VALUES,
    description: 'Available resume section types',
    example: 'experience',
  })
  type!: SectionType;
}
