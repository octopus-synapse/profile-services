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

// P2-082 — locale literals follow the canonical 'en' | 'pt-BR'
// ordering used across the codebase (Q27). The previous reverse
// ordering on the type union was a one-off — runtime semantics are
// unchanged but reviewers expected consistency with the other 30+
// callsites that use `['en', 'pt-BR']`.
export type SupportedLocale = 'en' | 'pt-BR';

export const SUPPORTED_LOCALES: SupportedLocale[] = ['en', 'pt-BR'];
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
