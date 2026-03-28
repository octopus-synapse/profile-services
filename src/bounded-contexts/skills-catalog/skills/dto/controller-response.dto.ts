/**
 * Resume Skills Controller Response DTOs
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ============================================================================
// Schemas
// ============================================================================

const SkillSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  name: z.string(),
  category: z.string(),
  level: z.number().int().optional(),
  order: z.number().int(),
});

const SkillDataSchema = z.object({
  skill: SkillSchema,
});

const SkillsDataSchema = z.object({
  skills: z.array(SkillSchema),
});

const DeleteSkillDataSchema = z.object({
  result: z.object({
    deleted: z.boolean(),
  }),
});

// ============================================================================
// DTOs
// ============================================================================

export class SkillDto extends createZodDto(SkillSchema) {}
export class SkillDataDto extends createZodDto(SkillDataSchema) {}
export class SkillsDataDto extends createZodDto(SkillsDataSchema) {}
export class DeleteSkillDataDto extends createZodDto(DeleteSkillDataSchema) {}
