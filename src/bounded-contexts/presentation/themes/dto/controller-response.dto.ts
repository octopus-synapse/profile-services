/**
 * Theme Response DTOs
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ============================================================================
// Schemas
// ============================================================================

const ThemeListDataSchema = z.object({
  themes: z.array(z.record(z.unknown())),
});

const ThemeEntityDataSchema = z.object({
  theme: z.record(z.unknown()),
});

const ThemeNullableEntityDataSchema = z.object({
  theme: z.record(z.unknown()).nullable(),
});

const ThemePaginationDataSchema = z.object({
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  totalPages: z.number().int(),
});

const ThemePaginatedListDataSchema = z.object({
  themes: z.array(z.record(z.unknown())),
  pagination: ThemePaginationDataSchema,
});

const ThemeApplyDataSchema = z.object({
  success: z.boolean(),
});

const ThemeResolvedConfigDataSchema = z.object({
  config: z.record(z.unknown()).nullable(),
});

const ResumeConfigOperationDataSchema = z.object({
  success: z.boolean(),
});

// ============================================================================
// DTOs
// ============================================================================

export class ThemeListDataDto extends createZodDto(ThemeListDataSchema) {}
export class ThemeEntityDataDto extends createZodDto(ThemeEntityDataSchema) {}
export class ThemeNullableEntityDataDto extends createZodDto(ThemeNullableEntityDataSchema) {}
export class ThemePaginationDataDto extends createZodDto(ThemePaginationDataSchema) {}
export class ThemePaginatedListDataDto extends createZodDto(ThemePaginatedListDataSchema) {}
export class ThemeApplyDataDto extends createZodDto(ThemeApplyDataSchema) {}
export class ThemeResolvedConfigDataDto extends createZodDto(ThemeResolvedConfigDataSchema) {}
export class ResumeConfigOperationDataDto extends createZodDto(ResumeConfigOperationDataSchema) {}
