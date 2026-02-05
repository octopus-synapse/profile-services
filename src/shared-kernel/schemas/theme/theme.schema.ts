/**
 * Theme Entity Schema
 *
 * Domain schema for theme entities.
 * Single source of truth for theme structure.
 *
 * @principle Single Source of Truth (Uncle Bob)
 * @principle Explicit Contracts (Martin Fowler)
 */

import { z } from "zod";
import { ThemeCategorySchema, ThemeStatusSchema } from "../../enums";

/**
 * Theme Author Schema (embedded in theme responses)
 */
export const ThemeAuthorSchema = z.object({
 id: z.string(),
 name: z.string().nullable(),
 email: z.string().nullable(),
});

export type ThemeAuthor = z.infer<typeof ThemeAuthorSchema>;

/**
 * Theme Entity Schema
 * Represents a complete theme as returned by the API
 */
export const ThemeSchema = z.object({
 id: z.string(),
 name: z.string(),
 description: z.string().nullable(),
 authorId: z.string(),
 category: ThemeCategorySchema,
 tags: z.array(z.string()),
 styleConfig: z.record(z.unknown()),
 thumbnailUrl: z.string().nullable(),
 previewImages: z.array(z.string()),
 status: ThemeStatusSchema,
 isSystemTheme: z.boolean(),
 usageCount: z.number(),
 rating: z.number().nullable(),
 ratingCount: z.number(),
 version: z.string(),
 parentThemeId: z.string().nullable(),
 approvedById: z.string().nullable(),
 approvedAt: z.string().nullable(),
 rejectionReason: z.string().nullable(),
 createdAt: z.string(),
 updatedAt: z.string(),
 author: ThemeAuthorSchema.optional(),
});

export type Theme = z.infer<typeof ThemeSchema>;

/**
 * Theme List Item Schema
 * Simplified theme for list views
 */
export const ThemeListItemSchema = ThemeSchema.pick({
 id: true,
 name: true,
 description: true,
 category: true,
 tags: true,
 thumbnailUrl: true,
 status: true,
 isSystemTheme: true,
 usageCount: true,
 rating: true,
 ratingCount: true,
 version: true,
 createdAt: true,
 updatedAt: true,
}).extend({
 author: ThemeAuthorSchema.optional(),
});

export type ThemeListItem = z.infer<typeof ThemeListItemSchema>;
