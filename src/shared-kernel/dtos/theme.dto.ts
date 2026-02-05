/**
 * Theme DTOs
 *
 * Data Transfer Objects for theme operations.
 * Single source of truth for theme management.
 */

import { z } from 'zod';
import { ThemeStatusSchema, ThemeCategorySchema } from '../enums';

/**
 * Theme Sort Fields
 */
export const ThemeSortFieldSchema = z.enum([
  'createdAt',
  'updatedAt',
  'usageCount',
  'rating',
  'name',
]);

export type ThemeSortField = z.infer<typeof ThemeSortFieldSchema>;

/**
 * Sort Direction
 */
export const SortDirectionSchema = z.enum(['asc', 'desc']);

export type SortDirection = z.infer<typeof SortDirectionSchema>;

/**
 * Create Theme Schema
 */
export const CreateThemeSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  category: ThemeCategorySchema,
  tags: z.array(z.string()).optional(),
  styleConfig: z.record(z.unknown()),
  parentThemeId: z.string().optional(),
});

export type CreateTheme = z.infer<typeof CreateThemeSchema>;

/**
 * Update Theme Schema
 */
export const UpdateThemeSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name too long')
    .optional(),
  description: z.string().max(500, 'Description too long').optional(),
  category: ThemeCategorySchema.optional(),
  tags: z.array(z.string()).optional(),
  styleConfig: z.record(z.unknown()).optional(),
});

export type UpdateTheme = z.infer<typeof UpdateThemeSchema>;

/**
 * Query Themes Schema
 */
export const QueryThemesSchema = z.object({
  status: ThemeStatusSchema.optional(),
  category: ThemeCategorySchema.optional(),
  search: z.string().optional(),
  authorId: z.string().optional(),
  systemOnly: z.coerce.boolean().optional(),
  sortBy: ThemeSortFieldSchema.default('createdAt'),
  sortDir: SortDirectionSchema.default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type QueryThemes = z.infer<typeof QueryThemesSchema>;

/**
 * Theme Application Schema
 */
export const ThemeApplicationSchema = z.object({
  themeId: z.string().min(1, 'Theme ID is required'),
});

export type ThemeApplication = z.infer<typeof ThemeApplicationSchema>;

/**
 * Theme Approval Schema
 */
export const ThemeApprovalSchema = z.object({
  themeId: z.string().cuid('Theme ID must be a valid CUID'),
  approved: z.boolean(),
  feedback: z.string().max(1000, 'Feedback too long').optional(),
  rejectionReason: z.string().max(500, 'Rejection reason too long').optional(),
});

export type ThemeApproval = z.infer<typeof ThemeApprovalSchema>;

/**
 * Apply Theme to Resume Schema
 */
export const ApplyThemeToResumeSchema = z.object({
  resumeId: z.string().uuid('Resume ID must be a valid UUID'),
  themeId: z.string().uuid('Theme ID must be a valid UUID'),
  customizations: z.record(z.unknown()).optional(),
});

export type ApplyThemeToResume = z.infer<typeof ApplyThemeToResumeSchema>;

/**
 * Fork Theme Schema
 */
export const ForkThemeSchema = z.object({
  themeId: z.string().uuid('Theme ID must be a valid UUID'),
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
});

export type ForkTheme = z.infer<typeof ForkThemeSchema>;

/**
 * Review Theme Schema (alias for ThemeApproval)
 */
export type ReviewTheme = ThemeApproval;
