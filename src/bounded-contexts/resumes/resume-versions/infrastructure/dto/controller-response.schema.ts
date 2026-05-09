import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

// ============================================================================
// Schemas
// ============================================================================

const ResumeVersionItemSchema = z.object({
  id: z.string(),
  versionNumber: z.number().int(),
  label: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
});

const ResumeVersionListDataSchema = z.object({ versions: z.array(ResumeVersionItemSchema) });

const ResumeVersionDataSchema = z.object({ version: ResumeVersionItemSchema });

const ResumeVersionRestoreDataSchema = z.object({
  success: z.boolean(),
  restoredFrom: IsoDateTimeSchema,
});

// ============================================================================
// DTOs
// ============================================================================

export type ResumeVersionItemDto = z.infer<typeof ResumeVersionItemSchema>;

export type ResumeVersionListDataDto = z.infer<typeof ResumeVersionListDataSchema>;

export type ResumeVersionDataDto = z.infer<typeof ResumeVersionDataSchema>;

export type ResumeVersionRestoreDataDto = z.infer<typeof ResumeVersionRestoreDataSchema>;
