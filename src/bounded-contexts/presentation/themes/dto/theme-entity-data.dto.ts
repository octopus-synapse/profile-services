import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

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

const ThemeEntityDataSchema = z.object({
  theme: ThemeSchema,
});

const ThemeNullableEntityDataSchema = z.object({
  theme: ThemeSchema.nullable(),
});

export class ThemeDto extends createZodDto(ThemeSchema) {}
export class ThemeEntityDataDto extends createZodDto(ThemeEntityDataSchema) {}
export class ThemeNullableEntityDataDto extends createZodDto(ThemeNullableEntityDataSchema) {}
