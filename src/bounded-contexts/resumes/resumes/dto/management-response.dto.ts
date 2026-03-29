/**
 * Resume Management Response DTOs
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ============================================================================
// Schemas
// ============================================================================

const ResumeListDataSchema = z.object({
  resumes: z.array(z.record(z.unknown())),
});

const ResumeDetailsDataSchema = z.object({
  resume: z.record(z.unknown()),
});

const ResumeOperationMessageDataSchema = z.object({
  message: z.string(),
});

// ============================================================================
// DTOs
// ============================================================================

export class ResumeListDataDto extends createZodDto(ResumeListDataSchema) {}
export class ResumeDetailsDataDto extends createZodDto(ResumeDetailsDataSchema) {}
export class ResumeOperationMessageDataDto extends createZodDto(ResumeOperationMessageDataSchema) {}
