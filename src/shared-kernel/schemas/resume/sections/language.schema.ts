/**
 * Language Schema
 *
 * Validation for language proficiency.
 * Maps to profile-services Language model.
 */

import { z } from "zod";
import {
 LanguageProficiencyEnum,
 CefrLevelEnum,
} from "../../../validations/onboarding-data.schema";

export const LanguageBaseSchema = z.object({
 name: z.string().min(1, "Language is required").max(50),
 level: LanguageProficiencyEnum,
 cefrLevel: CefrLevelEnum.optional(),
 isNative: z.boolean().default(false),
 order: z.number().int().min(0).optional(),
});

// ============================================================================
// Create DTO
// ============================================================================

export const CreateLanguageSchema = LanguageBaseSchema;
export type CreateLanguage = z.infer<typeof CreateLanguageSchema>;

// ============================================================================
// Update DTO
// ============================================================================

export const UpdateLanguageSchema = LanguageBaseSchema.partial();
export type UpdateLanguage = z.infer<typeof UpdateLanguageSchema>;

// ============================================================================
// Response DTO
// ============================================================================

export const LanguageSchema = LanguageBaseSchema.extend({
 id: z.string().cuid(),
 resumeId: z.string().cuid(),
 createdAt: z.coerce.date(),
 updatedAt: z.coerce.date(),
});

export type Language = z.infer<typeof LanguageSchema>;
