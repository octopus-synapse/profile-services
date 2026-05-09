import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { EXAMPLE_DATE_ONLY, EXAMPLE_ISO_DATETIME } from '../params/example-values.const';

extendZodWithOpenApi(z);

export const IsoDateTimeSchema = z
  .string()
  .datetime({ offset: true })
  .openapi({ example: EXAMPLE_ISO_DATETIME });

export type IsoDateTime = z.infer<typeof IsoDateTimeSchema>;

export const DateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
  .openapi({ example: EXAMPLE_DATE_ONLY });

export type DateOnly = z.infer<typeof DateOnlySchema>;
