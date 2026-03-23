/**
 * Supported locales for section type translations.
 * Every section type must provide translations for all locales on creation.
 */
export const SUPPORTED_LOCALES = ['en', 'pt-BR', 'es'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
