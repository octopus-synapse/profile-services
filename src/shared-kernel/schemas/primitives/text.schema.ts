import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { EXAMPLE_BIO, EXAMPLE_DESCRIPTION } from '../params/example-values.const';

extendZodWithOpenApi(z);

/**
 * Short free-text field for reasons, notes, captions, comments, etc.
 * Caps at 500 chars. Callers add `.optional()` / `.nullable()` as needed.
 */
export const ShortDescriptionSchema = z
  .string()
  .min(1, 'Description is required')
  .max(500, 'Description cannot exceed 500 characters')
  .openapi({
    example: EXAMPLE_DESCRIPTION,
    description: 'Short free-text description (1-500 characters).',
  });

export type ShortDescription = z.infer<typeof ShortDescriptionSchema>;

/**
 * Long free-text field for resume summaries, profile bios, post bodies, etc.
 * Caps at 2000 chars. Callers add `.optional()` / `.nullable()` as needed.
 */
export const BioSchema = z
  .string()
  .min(1, 'Bio is required')
  .max(2000, 'Bio cannot exceed 2000 characters')
  .openapi({
    example: EXAMPLE_BIO,
    description: 'Long free-text bio or summary (1-2000 characters).',
  });

export type Bio = z.infer<typeof BioSchema>;

export type ShortDescriptionDto = z.infer<typeof ShortDescriptionSchema>;
export type BioDto = z.infer<typeof BioSchema>;
