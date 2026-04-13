import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ThemeListItemSchema = z.object({
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

const ThemePaginationDataSchema = z.object({
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  totalPages: z.number().int(),
});

const ThemePaginatedListDataSchema = z.object({
  themes: z.array(ThemeListItemSchema),
  pagination: ThemePaginationDataSchema,
});

export class ThemePaginationDataDto extends createZodDto(ThemePaginationDataSchema) {}
export class ThemePaginatedListDataDto extends createZodDto(ThemePaginatedListDataSchema) {}
