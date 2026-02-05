/**
 * Recommendation Schema
 *
 * Validation for professional recommendations/references.
 * Maps to profile-services Recommendation model.
 */

import { z } from "zod";

// ============================================================================
// Base Schema
// ============================================================================

export const RecommendationBaseSchema = z.object({
 author: z.string().min(1, "Author name is required").max(200),
 position: z.string().max(200).optional(),
 company: z.string().max(200).optional(),
 content: z
  .string()
  .min(10, "Content must be at least 10 characters")
  .max(5000),
 date: z.coerce.date().optional(),
 order: z.number().int().min(0).optional(),
});

// ============================================================================
// Create DTO
// ============================================================================

export const CreateRecommendationSchema = RecommendationBaseSchema;
export type CreateRecommendation = z.infer<typeof CreateRecommendationSchema>;

// ============================================================================
// Update DTO
// ============================================================================

export const UpdateRecommendationSchema = RecommendationBaseSchema.partial();
export type UpdateRecommendation = z.infer<typeof UpdateRecommendationSchema>;

// ============================================================================
// Response DTO
// ============================================================================

export const RecommendationSchema = RecommendationBaseSchema.extend({
 id: z.string().cuid(),
 resumeId: z.string().cuid(),
 createdAt: z.coerce.date(),
 updatedAt: z.coerce.date(),
});

export type Recommendation = z.infer<typeof RecommendationSchema>;
