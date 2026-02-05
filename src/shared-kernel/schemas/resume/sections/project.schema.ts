/**
 * Project Schema
 *
 * Validation for personal and professional projects.
 * Maps to profile-services Project model.
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

export const ProjectBaseSchema = z.object({
 name: z.string().min(1, "Project name is required").max(100),
 description: z.string().max(1000).optional(),
 url: z.string().url().optional(),
 repositoryUrl: z.string().url().optional(),
 imageUrl: z.string().url().optional(),
 startDate: DateString.optional(),
 endDate: DateString.optional(),
 current: z.boolean().default(false),
 highlights: z.array(z.string().max(500)).optional(),
 technologies: z.array(z.string().max(50)).optional(),
 role: z.string().max(100).optional(),
 order: z.number().int().min(0).optional(),
});

// ============================================================================
// Create DTO
// ============================================================================

export const CreateProjectSchema = ProjectBaseSchema;
export type CreateProject = z.infer<typeof CreateProjectSchema>;

// ============================================================================
// Update DTO
// ============================================================================

export const UpdateProjectSchema = ProjectBaseSchema.partial();
export type UpdateProject = z.infer<typeof UpdateProjectSchema>;

// ============================================================================
// Response DTO
// ============================================================================

export const ProjectSchema = ProjectBaseSchema.extend({
 id: z.string().cuid(),
 resumeId: z.string().cuid(),
 createdAt: z.coerce.date(),
 updatedAt: z.coerce.date(),
});

export type Project = z.infer<typeof ProjectSchema>;
