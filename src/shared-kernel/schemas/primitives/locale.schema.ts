import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { LOCALES } from '@packages/i18n';
import { z } from 'zod';
import { EXAMPLE_LOCALE } from '../params/example-values.const';

extendZodWithOpenApi(z);

// `LOCALES` from `@packages/i18n/src/types.ts` is the single source of truth
// for supported locales (CLAUDE.md Q8). Cast through tuple to satisfy z.enum.
const LOCALE_TUPLE = LOCALES as readonly [string, ...string[]];

export const LocaleSchema = z.enum(LOCALE_TUPLE as [string, ...string[]]).openapi({
  example: EXAMPLE_LOCALE,
  description: `BCP-47 locale tag. Supported locales: ${LOCALES.join(', ')}.`,
});

export type LocaleValue = z.infer<typeof LocaleSchema>;

export type LocaleDto = z.infer<typeof LocaleSchema>;
