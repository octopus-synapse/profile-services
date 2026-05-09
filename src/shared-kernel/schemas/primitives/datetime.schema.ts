import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { EXAMPLE_DATE_ONLY, EXAMPLE_ISO_DATETIME } from '../params/example-values.const';

extendZodWithOpenApi(z);

export const IsoDateTimeSchema = z.string().datetime({ offset: true }).openapi('IsoDateTime', {
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
