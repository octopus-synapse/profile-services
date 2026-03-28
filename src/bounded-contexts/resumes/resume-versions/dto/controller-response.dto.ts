/**
 * Resume Versions Response DTOs
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ============================================================================
// Schemas
// ============================================================================

const ResumeVersionItemSchema = z.object({
  id: z.string(),
  versionNumber: z.number().int(),
  label: z.string().nullable(),
  createdAt: z.string().datetime(),
});

const ResumeVersionListDataSchema = z.object({
  versions: z.array(ResumeVersionItemSchema),
});

const ResumeVersionDataSchema = z.object({
  version: ResumeVersionItemSchema,
});

const ResumeVersionRestoreDataSchema = z.object({
  success: z.boolean(),
  restoredFrom: z.string().datetime(),
});

// ============================================================================
// DTOs
// ============================================================================

export class ResumeVersionItemDto extends createZodDto(ResumeVersionItemSchema) {}
export class ResumeVersionListDataDto extends createZodDto(ResumeVersionListDataSchema) {}
export class ResumeVersionDataDto extends createZodDto(ResumeVersionDataSchema) {}
export class ResumeVersionRestoreDataDto extends createZodDto(ResumeVersionRestoreDataSchema) {}
