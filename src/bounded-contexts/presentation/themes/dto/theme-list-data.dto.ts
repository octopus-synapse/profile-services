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
});

const ThemeListDataSchema = z.object({
  themes: z.array(ThemeListItemSchema),
});

export class ThemeListItemDto extends createZodDto(ThemeListItemSchema) {}
export class ThemeListDataDto extends createZodDto(ThemeListDataSchema) {}
