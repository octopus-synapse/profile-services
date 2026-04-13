/**
 * Theme Response DTOs
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ============================================================================
// Shared Theme Schema
// ============================================================================

const ThemeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  authorId: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  styleConfig: z.unknown(),
  sectionStyles: z.unknown(),
  thumbnailUrl: z.string().nullable(),
  previewImages: z.array(z.string()),
  status: z.string(),
  isSystemTheme: z.boolean(),
  atsScore: z.number().int().nullable(),
  usageCount: z.number().int(),
  rating: z.number().nullable(),
  ratingCount: z.number().int(),
  version: z.string(),
  parentThemeId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  publishedAt: z.date().nullable(),
});

// Some queries include author relation
const ThemeWithAuthorSchema = ThemeSchema.extend({
  author: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
      username: z.string().nullable(),
    })
    .optional(),
  _count: z
    .object({
      resumes: z.number().int(),
      forks: z.number().int(),
    })
    .optional(),
});

// ============================================================================
// Schemas
// ============================================================================

const ThemeListDataSchema = z.object({
  themes: z.array(ThemeSchema),
});

const ThemeEntityDataSchema = z.object({
  theme: ThemeSchema,
});

const ThemeNullableEntityDataSchema = z.object({
  theme: ThemeWithAuthorSchema.nullable(),
});

const ThemePaginationDataSchema = z.object({
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  totalPages: z.number().int(),
});

const ThemePaginatedListDataSchema = z.object({
  themes: z.array(ThemeWithAuthorSchema),
  pagination: ThemePaginationDataSchema,
});

const ThemeApplyDataSchema = z.object({
  success: z.boolean(),
});

const ThemeResolvedConfigDataSchema = z.object({
  config: z.record(z.string()).nullable(),
});

const ResumeConfigOperationDataSchema = z.object({
  success: z.boolean(),
});

// ============================================================================
// DTOs
// ============================================================================

export class ThemeDto extends createZodDto(ThemeSchema) {}
export class ThemeWithAuthorDto extends createZodDto(ThemeWithAuthorSchema) {}
export class ThemeListDataDto extends createZodDto(ThemeListDataSchema) {}
export class ThemeEntityDataDto extends createZodDto(ThemeEntityDataSchema) {}
export class ThemeNullableEntityDataDto extends createZodDto(ThemeNullableEntityDataSchema) {}
export class ThemePaginationDataDto extends createZodDto(ThemePaginationDataSchema) {}
export class ThemePaginatedListDataDto extends createZodDto(ThemePaginatedListDataSchema) {}
export class ThemeApplyDataDto extends createZodDto(ThemeApplyDataSchema) {}
export class ThemeResolvedConfigDataDto extends createZodDto(ThemeResolvedConfigDataSchema) {}
export class ResumeConfigOperationDataDto extends createZodDto(ResumeConfigOperationDataSchema) {}
