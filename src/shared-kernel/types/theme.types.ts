import { z } from 'zod';
import {
  ThemeSchema,
  ThemeListItemSchema,
} from '../schemas/theme/theme.schema';

/**
 * Theme Response Schemas
 * Standard API response wrappers for theme endpoints
 */
export const ThemeResponseSchema = z.object({
  data: z.object({
    theme: ThemeSchema,
  }),
});

export type ThemeResponseEnvelope = z.infer<typeof ThemeResponseSchema>;

export const ThemeListResponseSchema = z.object({
  data: z.object({
    themes: z.array(ThemeListItemSchema),
  }),
  meta: z
    .object({
      total: z.number(),
      page: z.number(),
      limit: z.number(),
      totalPages: z.number(),
    })
    .optional(),
});

export type ThemeListResponseEnvelope = z.infer<typeof ThemeListResponseSchema>;
