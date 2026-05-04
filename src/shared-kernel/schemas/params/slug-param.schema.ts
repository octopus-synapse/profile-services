import { z } from 'zod';

/** Route param: `/:slug` (URL-safe public identifier) */
export const SlugParamSchema = z.object({
  slug: z
    .string()
    .min(1, 'slug is required')
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with dashes'),
});

export type SlugParam = z.infer<typeof SlugParamSchema>;
