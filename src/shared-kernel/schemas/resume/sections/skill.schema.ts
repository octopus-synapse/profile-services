/**
 * Skill Schema
 *
 * Validation for technical and soft skills.
 * Maps to profile-services Skill model.
 */

import { z } from 'zod';
import { SkillLevelSchema } from '../../../enums';

// ============================================================================
// Base Schema
// ============================================================================

export const SkillBaseSchema = z.object({
  name: z.string().min(1, 'Skill name is required').max(50),
  level: SkillLevelSchema,
  category: z.string().max(50).optional(),
  yearsOfExperience: z.number().int().min(0).max(50).optional(),
  order: z.number().int().min(0).optional(),
});

// ============================================================================
// Create DTO
// ============================================================================

export const CreateSkillSchema = SkillBaseSchema;
export type CreateSkill = z.infer<typeof CreateSkillSchema>;

// ============================================================================
// Update DTO
// ============================================================================

export const UpdateSkillSchema = SkillBaseSchema.partial();
export type UpdateSkill = z.infer<typeof UpdateSkillSchema>;

// ============================================================================
// Response DTO
// ============================================================================

export const SkillSchema = SkillBaseSchema.extend({
  id: z.string().cuid(),
  resumeId: z.string().cuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Skill = z.infer<typeof SkillSchema>;

// ============================================================================
// Bulk Operations
// ============================================================================

export const BulkCreateSkillsSchema = z.object({
  skills: z.array(CreateSkillSchema).min(1, 'At least one skill is required'),
});

export type BulkCreateSkills = z.infer<typeof BulkCreateSkillsSchema>;
