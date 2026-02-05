/**
 * Education Schema
 *
 * Validation for educational background.
 * Maps to profile-services Education model.
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

export const EducationBaseSchema = z.object({
 institution: z.string().min(1, "Institution is required").max(200),
 degree: z.string().min(1, "Degree is required").max(100),
 field: z.string().max(100).optional(),
 location: z.string().max(100).optional(),
 startDate: DateString,
 endDate: DateString.optional(),
 current: z.boolean().default(false),
 description: z.string().max(1000).optional(),
 gpa: z.string().max(10).optional(),
 order: z.number().int().min(0).optional(),
});

// ============================================================================
// Create DTO
// ============================================================================

export const CreateEducationSchema = EducationBaseSchema;
export type CreateEducation = z.infer<typeof CreateEducationSchema>;

// ============================================================================
// Update DTO
// ============================================================================

export const UpdateEducationSchema = EducationBaseSchema.partial();
export type UpdateEducation = z.infer<typeof UpdateEducationSchema>;

// ============================================================================
// Response DTO
// ============================================================================

export const EducationSchema = EducationBaseSchema.extend({
 id: z.string().cuid(),
 resumeId: z.string().cuid(),
 createdAt: z.coerce.date(),
 updatedAt: z.coerce.date(),
});

export type Education = z.infer<typeof EducationSchema>;
