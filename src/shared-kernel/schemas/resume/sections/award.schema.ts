/**
 * Award Schema
 *
 * Validation for professional awards and recognitions.
 * Maps to profile-services Award model.
 */

import { z } from "zod";

// ============================================================================
// Base Schema
// ============================================================================

export const AwardBaseSchema = z.object({
 title: z.string().min(1, "Title is required").max(200),
 issuer: z.string().min(1, "Issuer is required").max(200),
 date: z.coerce.date(),
 description: z.string().max(2000).optional(),
 order: z.number().int().min(0).optional(),
});

// ============================================================================
// Create DTO
// ============================================================================

export const CreateAwardSchema = AwardBaseSchema;
export type CreateAward = z.infer<typeof CreateAwardSchema>;

// ============================================================================
// Update DTO
// ============================================================================

export const UpdateAwardSchema = AwardBaseSchema.partial();
export type UpdateAward = z.infer<typeof UpdateAwardSchema>;

// ============================================================================
// Response DTO
// ============================================================================

export const AwardSchema = AwardBaseSchema.extend({
 id: z.string().cuid(),
 resumeId: z.string().cuid(),
 createdAt: z.coerce.date(),
 updatedAt: z.coerce.date(),
});

export type Award = z.infer<typeof AwardSchema>;
