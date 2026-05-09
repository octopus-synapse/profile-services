import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { EXAMPLE_GENERIC_ID } from './example-values.const';

extendZodWithOpenApi(z);

/**
 * Generic single-id route param: `/:id`.
 *
 * Validation tightened to `z.string().uuid()` after the Prisma UUID v7
 * migration (Q11 phase 2). v4 and v7 share the same textual form so
 * legacy rows still validate.
 */
export const IdParamSchema = z.object({
  id: z.string().uuid('ID must be a valid UUID').openapi({ example: EXAMPLE_GENERIC_ID }),
});

export type IdParam = z.infer<typeof IdParamSchema>;
