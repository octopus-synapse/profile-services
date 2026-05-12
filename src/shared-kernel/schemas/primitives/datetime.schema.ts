import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { EXAMPLE_DATE_ONLY, EXAMPLE_ISO_DATETIME } from '../params/example-values.const';

extendZodWithOpenApi(z);

// Intentionally NOT registered as a `components.schemas` entry: many
// response shapes use `IsoDateTimeSchema.nullable()` and the kubb code
// generator currently emits broken zod when `$ref` is combined with
// `nullable: true` (allOf wrapping). Inline emission keeps the
// description and format intact while sidestepping that bug.
export const IsoDateTimeSchema = z.string().datetime({ offset: true }).openapi({
  example: EXAMPLE_ISO_DATETIME,
  description: 'ISO-8601 timestamp with timezone offset (RFC 3339).',
});

export type IsoDateTime = z.infer<typeof IsoDateTimeSchema>;

export const DateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
  .openapi('DateOnly', {
    example: EXAMPLE_DATE_ONLY,
    description: 'Calendar date in `YYYY-MM-DD` format (no time component).',
  });

export type DateOnly = z.infer<typeof DateOnlySchema>;
