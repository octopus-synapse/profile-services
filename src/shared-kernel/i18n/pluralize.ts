/**
 * P2-113 — minimal two-form pluralizer. The project's app UI is
 * locked to `en` + `pt-BR` (CLAUDE.md Q27), both of which use
 * singular/plural-only morphology, so a 2-form helper is correct
 * for every supported locale today.
 *
 * If we ever add a locale with more plural categories (Russian,
 * Arabic, Polish), swap this implementation for `Intl.PluralRules`
 * and accept a category-keyed object — every caller goes through
 * this helper, so the migration is single-file.
 */
export function pluralize(n: number, singular: string, plural: string): string {
  return n === 1 ? `${n} ${singular}` : `${n} ${plural}`;
}
