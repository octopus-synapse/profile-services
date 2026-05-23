import { z } from 'zod';

// ============================================================================
// Schemas
// ============================================================================

const ExportFormatSchema = z.object({ format: z.enum(['PDF', 'DOCX', 'JSON']) });

const UserRoleSchema = z.object({ role: z.enum(['USER', 'ADMIN']) });

const SectionTypeSchema = z.object({
  key: z.string(),
  semanticKind: z.string(),
  title: z.string(),
});

const ExportFormatsDataSchema = z.object({ formats: z.array(ExportFormatSchema) });

const UserRolesDataSchema = z.object({ roles: z.array(UserRoleSchema) });

const SectionTypesDataSchema = z.object({ types: z.array(SectionTypeSchema) });

// ============================================================================
// DTOs
// ============================================================================

export type ExportFormatDto = z.infer<typeof ExportFormatSchema>;

export type UserRoleDto = z.infer<typeof UserRoleSchema>;

export type SectionTypeDto = z.infer<typeof SectionTypeSchema>;

export type ExportFormatsDataDto = z.infer<typeof ExportFormatsDataSchema>;

export type UserRolesDataDto = z.infer<typeof UserRolesDataSchema>;

export type SectionTypesDataDto = z.infer<typeof SectionTypesDataSchema>;
