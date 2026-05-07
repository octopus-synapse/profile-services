import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { EXAMPLE_SLUG } from './example-ids.const';

extendZodWithOpenApi(z);

/** Route param: `/:slug` (URL-safe public identifier) */
export const SlugParamSchema = z.object({
  slug: z
    .string()
    .min(1, 'slug is required')
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with dashes')
    .openapi({ example: EXAMPLE_SLUG }),
});

export type SlugParam = z.infer<typeof SlugParamSchema>;
