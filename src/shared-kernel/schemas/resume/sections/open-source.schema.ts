/**
 * Open Source Contribution Schema
 *
 * Validation for open source project contributions.
 * Maps to profile-services OpenSourceContribution model.
 */

import { z } from "zod";

// ============================================================================
// Enums
// ============================================================================

export const OpenSourceRoleSchema = z.enum([
 "MAINTAINER",
 "CORE_CONTRIBUTOR",
 "CONTRIBUTOR",
 "REVIEWER",
 "DOCUMENTATION",
 "TRANSLATOR",
 "OTHER",
]);

export type OpenSourceRole = z.infer<typeof OpenSourceRoleSchema>;

// ============================================================================
// Base Schema
// ============================================================================

export const OpenSourceBaseSchema = z.object({
 projectName: z.string().min(1, "Project name is required").max(200),
 projectUrl: z.string().url("Must be a valid URL"),
 role: OpenSourceRoleSchema,
 description: z.string().max(3000).optional(),
 technologies: z.array(z.string()).optional().default([]),
 commits: z.number().int().min(0).optional(),
 prsCreated: z.number().int().min(0).optional(),
 prsMerged: z.number().int().min(0).optional(),
 issuesClosed: z.number().int().min(0).optional(),
 stars: z.number().int().min(0).optional(),
 startDate: z.coerce.date(),
 endDate: z.coerce.date().optional(),
 isCurrent: z.boolean().optional().default(false),
 order: z.number().int().min(0).optional(),
});

// ============================================================================
// Create DTO
// ============================================================================

export const CreateOpenSourceSchema = OpenSourceBaseSchema;
export type CreateOpenSource = z.infer<typeof CreateOpenSourceSchema>;

// ============================================================================
// Update DTO
// ============================================================================

export const UpdateOpenSourceSchema = OpenSourceBaseSchema.partial();
export type UpdateOpenSource = z.infer<typeof UpdateOpenSourceSchema>;

// ============================================================================
// Response DTO
// ============================================================================

export const OpenSourceSchema = OpenSourceBaseSchema.extend({
 id: z.string().cuid(),
 resumeId: z.string().cuid(),
 createdAt: z.coerce.date(),
 updatedAt: z.coerce.date(),
});

export type OpenSource = z.infer<typeof OpenSourceSchema>;
