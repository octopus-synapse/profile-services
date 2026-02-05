import { z } from "zod";

/**
 * Theme Status Enum (Domain)
 *
 * Defines the lifecycle status of themes.
 * This is a DOMAIN concept - independent of any infrastructure (Prisma, etc).
 */
export const ThemeStatusSchema = z.enum([
  "DRAFT",
  "PRIVATE",
  "PENDING_APPROVAL",
  "PUBLISHED",
  "REJECTED",
]);

export type ThemeStatus = z.infer<typeof ThemeStatusSchema>;

/**
 * Theme Category Enum (Domain)
 *
 * Defines the visual categories for themes.
 */
export const ThemeCategorySchema = z.enum([
  "PROFESSIONAL",
  "CREATIVE",
  "TECHNICAL",
  "ACADEMIC",
  "MINIMAL",
  "MODERN",
  "CLASSIC",
  "EXECUTIVE",
]);

export type ThemeCategory = z.infer<typeof ThemeCategorySchema>;
