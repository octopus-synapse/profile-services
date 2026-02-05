/**
 * Achievement Schema
 *
 * Validation for professional achievements (gamification, badges, etc.).
 * Maps to profile-services Achievement model.
 */

import { z } from "zod";

// ============================================================================
// Enums
// ============================================================================

export const AchievementTypeSchema = z.enum([
 "CERTIFICATION_BADGE",
 "PERFORMANCE_AWARD",
 "GAMIFICATION_BADGE",
 "MILESTONE",
 "RECOGNITION",
 "LEADERBOARD",
 "OTHER",
]);

export type AchievementType = z.infer<typeof AchievementTypeSchema>;

// ============================================================================
// Base Schema
// ============================================================================

export const AchievementBaseSchema = z.object({
 type: AchievementTypeSchema,
 title: z.string().min(1, "Title is required").max(200),
 description: z.string().max(2000).optional(),
 badgeUrl: z.string().url().optional().or(z.literal("")),
 verificationUrl: z.string().url().optional().or(z.literal("")),
 achievedAt: z.coerce.date(),
 value: z.number().int().optional(),
 rank: z.string().max(100).optional(),
 order: z.number().int().min(0).optional(),
});

// ============================================================================
// Create DTO
// ============================================================================

export const CreateAchievementSchema = AchievementBaseSchema;
export type CreateAchievement = z.infer<typeof CreateAchievementSchema>;

// ============================================================================
// Update DTO
// ============================================================================

export const UpdateAchievementSchema = AchievementBaseSchema.partial();
export type UpdateAchievement = z.infer<typeof UpdateAchievementSchema>;

// ============================================================================
// Response DTO
// ============================================================================

export const AchievementSchema = AchievementBaseSchema.extend({
 id: z.string().cuid(),
 resumeId: z.string().cuid(),
 createdAt: z.coerce.date(),
 updatedAt: z.coerce.date(),
});

export type Achievement = z.infer<typeof AchievementSchema>;
