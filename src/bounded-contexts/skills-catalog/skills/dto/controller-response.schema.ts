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

const SkillDataSchema = z.object({ skill: SkillSchema });

const SkillsDataSchema = z.object({ skills: z.array(SkillSchema) });

const DeleteSkillDataSchema = z.object({
  result: z.object({ deleted: z.boolean() }),
});

// ============================================================================
// DTOs
// ============================================================================

export type SkillDto = z.infer<typeof SkillSchema>;

export type SkillDataDto = z.infer<typeof SkillDataSchema>;

export type SkillsDataDto = z.infer<typeof SkillsDataSchema>;

export type DeleteSkillDataDto = z.infer<typeof DeleteSkillDataSchema>;
