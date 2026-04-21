/**
 * Translation Port
 *
 * Abstract surface for turning a stable message code + params into a localized
 * string. Kept provider-agnostic so the concrete loader (JSON file, DB, remote)
 * can evolve without touching callers.
 *
 * No fallback policy lives here — the implementation MUST crash (throw
 * MissingTranslationError) when a code isn't present in both locales.
 * We prefer a loud failure over a silent lie.
 */

export type SupportedLocale = 'pt-BR' | 'en';

export const SUPPORTED_LOCALES: SupportedLocale[] = ['pt-BR', 'en'];
export const DEFAULT_LOCALE: SupportedLocale = 'en';

export interface TranslationParams {
  readonly [key: string]: string | number | boolean | null;
}

export class MissingTranslationError extends Error {
  constructor(
    public readonly code: string,
    public readonly locale: SupportedLocale,
  ) {
    super(`Missing translation for "${code}" in locale "${locale}"`);
    this.name = 'MissingTranslationError';
  }
}

export abstract class TranslationPort {
  abstract translate(code: string, params: TranslationParams, locale: SupportedLocale): string;
  abstract has(code: string, locale: SupportedLocale): boolean;
}

export const TRANSLATION_PORT = Symbol('TranslationPort');
