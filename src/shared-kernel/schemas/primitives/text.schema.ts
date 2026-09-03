import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { EXAMPLE_BIO, EXAMPLE_DESCRIPTION, EXAMPLE_HEADLINE } from '../params/example-values.const';
import { HEADLINE_MAX_LENGTH } from './text-lengths.const';

extendZodWithOpenApi(z);

/**
 * Short free-text field for reasons, notes, captions, comments, etc.
 * Caps at 500 chars. Callers add `.optional()` / `.nullable()` as needed.
 */
export const ShortDescriptionSchema = z
  .string()
  .min(1, 'Description is required')
  .max(500, 'Description cannot exceed 500 characters')
  .openapi('ShortDescription', {
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
  .openapi('Bio', {
    example: EXAMPLE_BIO,
    description: 'Long free-text bio or summary (1-2000 characters).',
  });

export type Bio = z.infer<typeof BioSchema>;

/**
 * The one-line professional headline (ADR-003 §7: it lives on the résumé).
 *
 * It was declared four times with three different lengths' worth of error
 * messages and no shared OpenAPI name, while the column behind it is
 * `VarChar(120)`. One definition keeps the DTO and the column in step.
 */
export const HeadlineSchema = z
  .string()
  .trim()
  .max(HEADLINE_MAX_LENGTH, `Headline cannot exceed ${HEADLINE_MAX_LENGTH} characters`)
  .openapi('Headline', {
    example: EXAMPLE_HEADLINE,
    description: `One-line professional headline (up to ${HEADLINE_MAX_LENGTH} characters).`,
  });

export type Headline = z.infer<typeof HeadlineSchema>;

export type ShortDescriptionDto = z.infer<typeof ShortDescriptionSchema>;
export type BioDto = z.infer<typeof BioSchema>;
