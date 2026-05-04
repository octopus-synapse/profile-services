import { z, type ZodTypeAny } from 'zod';

/**
 * Build a Zod schema that requires every entry in `requiredLocales` to
 * be present (mapped to `innerSchema`). Optional locales beyond the
 * required set are allowed.
 *
 * Generalises the pattern hand-rolled in
 * `bounded-contexts/resumes/section-types/dto/section-type.schema.ts`
 * (Q55 in the duplication audit) so other BCs that adopt translations
 * stop reinventing it.
 *
 * @example
 *   const TranslationsSchema = createLocalizedSchema(SectionTranslationSchema, ['en', 'pt-BR']);
 */
export function createLocalizedSchema<T extends ZodTypeAny>(
  innerSchema: T,
  requiredLocales: readonly string[],
) {
  return z.record(z.string(), innerSchema).refine(
    (translations) => requiredLocales.every((locale) => locale in translations),
    {
      message: `Translations must include all supported locales: ${requiredLocales.join(', ')}`,
    },
  );
}
