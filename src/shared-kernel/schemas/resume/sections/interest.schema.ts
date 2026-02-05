/**
 * Interest Schema
 *
 * Validation for personal/professional interests.
 * Maps to profile-services Interest model.
 */

import { z } from "zod";

// ============================================================================
// Base Schema
// ============================================================================

export const InterestBaseSchema = z.object({
 name: z.string().min(1, "Name is required").max(100),
 description: z.string().max(500).optional(),
 order: z.number().int().min(0).optional(),
});

// ============================================================================
// Create DTO
// ============================================================================

export const CreateInterestSchema = InterestBaseSchema;
export type CreateInterest = z.infer<typeof CreateInterestSchema>;

// ============================================================================
// Update DTO
// ============================================================================

export const UpdateInterestSchema = InterestBaseSchema.partial();
export type UpdateInterest = z.infer<typeof UpdateInterestSchema>;

// ============================================================================
// Response DTO
// ============================================================================

export const InterestSchema = InterestBaseSchema.extend({
 id: z.string().cuid(),
 resumeId: z.string().cuid(),
 createdAt: z.coerce.date(),
 updatedAt: z.coerce.date(),
});

export type Interest = z.infer<typeof InterestSchema>;
