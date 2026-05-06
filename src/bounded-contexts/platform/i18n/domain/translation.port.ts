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

// P2-135 — re-export from the canonical
// `shared-kernel/constants/locale.constants` so the i18n BC doesn't
// keep its own copy of the locale list. Backwards-compatible: callers
// that import `SupportedLocale` / `SUPPORTED_LOCALES` / `DEFAULT_LOCALE`
// from this module continue to work.
import {
  DEFAULT_LOCALE as CANONICAL_DEFAULT_LOCALE,
  SUPPORTED_LOCALES as CANONICAL_SUPPORTED_LOCALES,
  type SupportedLocale as CanonicalSupportedLocale,
} from '@/shared-kernel/constants/locale.constants';

export type SupportedLocale = CanonicalSupportedLocale;
export const SUPPORTED_LOCALES = CANONICAL_SUPPORTED_LOCALES;
export const DEFAULT_LOCALE = CANONICAL_DEFAULT_LOCALE;

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
