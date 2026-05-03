/**
 * Route descriptors for the social BC's self-declared skill proficiency
 * surface. Replaces `SkillProficiencyController`.
 *
 * Note: the legacy DELETE returned `204 No Content`. The Route
 * synthesizer always uses 200 for non-POST verbs today, so this
 * migration changes the success status code to 200 with an explicit
 * `{ success: true }` body.
 */

import { z } from 'zod';
import type { SkillProficiencyService } from './services/skill-proficiency.service';

export abstract class SkillProficiencyRoutesBundle {
  abstract readonly service: SkillProficiencyService;
}

export const SkillNameParam = z.object({ skillName: z.string() });
export const SetProficiencyBody = z.object({
  proficiency: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
  yearsOfExperience: z.number().int().min(0).max(80).optional(),
});

export const SkillProficiencyEntrySchema = z.object({
  skillName: z.string(),
  proficiency: z.string(),
  yearsOfExperience: z.number().int().nullable(),
  updatedAt: z.string().datetime(),
});

export const ListProficiencyResponseSchema = z.object({
  proficiencies: z.array(SkillProficiencyEntrySchema),
});

export const SetProficiencyResponseSchema = z.object({
  skillName: z.string(),
  proficiency: z.string(),
});

export const ClearProficiencyResponseSchema = z.null();
