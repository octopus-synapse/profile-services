/**
 * Experience Schema
 *
 * Validation for professional work experience.
 * Maps to profile-services Experience model.
 */

import { z } from "zod";

// ============================================================================
// Shared Date Format
// ============================================================================

const DateString = z
 .string()
 .regex(
  /^\d{4}-\d{2}(-\d{2})?$/,
  "Invalid date format (YYYY-MM or YYYY-MM-DD)"
 );

// ============================================================================
// Base Schema
// ============================================================================

export const ExperienceBaseSchema = z.object({
 company: z.string().min(1, "Company is required").max(100),
 position: z.string().min(1, "Position is required").max(100),
 location: z.string().max(100).optional(),
 startDate: DateString,
 endDate: DateString.optional(),
 current: z.boolean().default(false),
 description: z.string().max(2000).optional(),
 achievements: z.array(z.string().max(500)).optional(),
 skills: z.array(z.string().max(50)).optional(),
 order: z.number().int().min(0).optional(),
});

// ============================================================================
// Create DTO
// ============================================================================

export const CreateExperienceSchema = ExperienceBaseSchema;
export type CreateExperience = z.infer<typeof CreateExperienceSchema>;

// ============================================================================
// Update DTO
// ============================================================================

export const UpdateExperienceSchema = ExperienceBaseSchema.partial();
export type UpdateExperience = z.infer<typeof UpdateExperienceSchema>;

// ============================================================================
// Response DTO
// ============================================================================

export const ExperienceSchema = ExperienceBaseSchema.extend({
 id: z.string().cuid(),
 resumeId: z.string().cuid(),
 createdAt: z.coerce.date(),
 updatedAt: z.coerce.date(),
});

export type Experience = z.infer<typeof ExperienceSchema>;
