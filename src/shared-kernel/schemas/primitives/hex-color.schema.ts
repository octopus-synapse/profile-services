import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { EXAMPLE_HEX_COLOR } from '../params/example-values.const';

extendZodWithOpenApi(z);

export const HexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Hex color must be in #RRGGBB format')
  .openapi('HexColor', {
    example: EXAMPLE_HEX_COLOR,
    description: 'Six-digit hex color in `#RRGGBB` format (case-insensitive).',
  });

export type HexColor = z.infer<typeof HexColorSchema>;

export type HexColorDto = z.infer<typeof HexColorSchema>;
