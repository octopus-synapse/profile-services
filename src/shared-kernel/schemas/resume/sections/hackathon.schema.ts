/**
 * Hackathon Schema
 *
 * Validation for hackathon participations and achievements.
 * Maps to profile-services Hackathon model.
 */

import { z } from "zod";

// ============================================================================
// Base Schema
// ============================================================================

export const HackathonBaseSchema = z.object({
 name: z.string().min(1, "Hackathon name is required").max(200),
 organizer: z.string().min(1, "Organizer is required").max(200),
 position: z.string().max(100).optional(),
 projectName: z.string().min(1, "Project name is required").max(200),
 description: z.string().max(3000).optional(),
 technologies: z.array(z.string()).optional().default([]),
 teamSize: z.number().int().min(1).optional(),
 demoUrl: z.string().url().optional().or(z.literal("")),
 repoUrl: z.string().url().optional().or(z.literal("")),
 date: z.coerce.date(),
 prize: z.string().max(200).optional(),
 order: z.number().int().min(0).optional(),
});

// ============================================================================
// Create DTO
// ============================================================================

export const CreateHackathonSchema = HackathonBaseSchema;
export type CreateHackathon = z.infer<typeof CreateHackathonSchema>;

// ============================================================================
// Update DTO
// ============================================================================

export const UpdateHackathonSchema = HackathonBaseSchema.partial();
export type UpdateHackathon = z.infer<typeof UpdateHackathonSchema>;

// ============================================================================
// Response DTO
// ============================================================================

export const HackathonSchema = HackathonBaseSchema.extend({
 id: z.string().cuid(),
 resumeId: z.string().cuid(),
 createdAt: z.coerce.date(),
 updatedAt: z.coerce.date(),
});

export type Hackathon = z.infer<typeof HackathonSchema>;
