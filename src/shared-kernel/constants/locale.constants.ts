/**
 * Supported app locales for i18n + section-type translations.
 * Every section type must provide translations for all locales on
 * creation. 'es' was removed per Q27 in the duplication audit; the
 * project supports only English and Brazilian Portuguese for now.
 */
export const SUPPORTED_LOCALES = ['en', 'pt-BR'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

// P2-135 — `DEFAULT_LOCALE` lives next to its sibling so callers
// that need both can import from one place.
export const DEFAULT_LOCALE: SupportedLocale = 'en';
