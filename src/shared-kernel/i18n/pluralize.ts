/**
 * Minimal two-form pluralizer. `LOCALES` (en + pt-BR) both use
 * singular/plural-only morphology. If a locale with more plural
 * categories is ever added (Russian, Arabic, Polish), swap this
 * for `Intl.PluralRules`
 * and accept a category-keyed object — every caller goes through
 * this helper, so the migration is single-file.
 */
export function pluralize(n: number, singular: string, plural: string): string {
  return n === 1 ? `${n} ${singular}` : `${n} ${plural}`;
}
