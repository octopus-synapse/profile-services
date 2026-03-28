/**
 * Enum Response DTOs
 *
 * DTOs for domain enums exposed through API.
 * Uses createZodDto for unified types + validation + Swagger.
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ============================================================================
// Schemas
// ============================================================================

const ExportFormatSchema = z.object({
  format: z.enum(['PDF', 'DOCX', 'JSON']),
});

const UserRoleSchema = z.object({
  role: z.enum(['USER', 'ADMIN']),
});

const SectionTypeSchema = z.object({
  key: z.string(),
  semanticKind: z.string(),
  title: z.string(),
});

const ExportFormatsDataSchema = z.object({
  formats: z.array(ExportFormatSchema),
});

const UserRolesDataSchema = z.object({
  roles: z.array(UserRoleSchema),
});

const SectionTypesDataSchema = z.object({
  types: z.array(SectionTypeSchema),
});

// ============================================================================
// DTOs
// ============================================================================

export class ExportFormatResponseDto extends createZodDto(ExportFormatSchema) {}
export class UserRoleResponseDto extends createZodDto(UserRoleSchema) {}
export class SectionTypeResponseDto extends createZodDto(SectionTypeSchema) {}
export class ExportFormatsDataDto extends createZodDto(ExportFormatsDataSchema) {}
export class UserRolesDataDto extends createZodDto(UserRolesDataSchema) {}
export class SectionTypesDataDto extends createZodDto(SectionTypesDataSchema) {}
