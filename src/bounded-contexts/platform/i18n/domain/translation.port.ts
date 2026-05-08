import { DEFAULT_LOCALE, LOCALES, type Locale } from '@packages/i18n';

export type { Locale };
export { DEFAULT_LOCALE, LOCALES };

export type SupportedLocale = Locale;
export const SUPPORTED_LOCALES = LOCALES;

export interface TranslationParams {
  readonly [key: string]: string | number | boolean | null;
}

export class MissingTranslationError extends Error {
  constructor(
    public readonly code: string,
    public readonly locale: Locale,
  ) {
    super(`Missing translation for "${code}" in locale "${locale}"`);
    this.name = 'MissingTranslationError';
  }
}

export abstract class TranslationPort {
  abstract translate(code: string, params: TranslationParams, locale: Locale): string;
  abstract has(code: string, locale: Locale): boolean;
}
