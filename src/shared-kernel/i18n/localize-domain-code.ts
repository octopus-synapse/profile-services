/**
 * Localize a `DomainCode` by looking its `code` up in the i18n catalog and
 * interpolating `params` for the negotiated locale.
 *
 * Single entry point shared by:
 *
 *   - `mapDomainErrorToHttp` (exception → HTTP envelope) — see
 *     `shared-kernel/http/error.mapper.ts`.
 *   - Route handlers that return validation-result arrays in 200 bodies.
 *     See the username validate route as the canonical example.
 *
 * Throws `MissingTranslationError` when the catalog has no entry for the
 * code in the locale — caller decides whether to map to a 500 envelope
 * (the exception path does) or rethrow (the validation-result path lets it
 * bubble so the bug surfaces in staging instead of silently shipping a
 * placeholder string to prod).
 */

import type {
  SupportedLocale,
  TranslationParams,
  TranslationPort,
} from '@/bounded-contexts/platform/i18n/domain/translation.port';
import type { DomainCode, DomainCodeParam, LocalizedDomainCode } from './domain-code';

export function localizeDomainCode(
  dc: DomainCode,
  i18n: TranslationPort,
  locale: SupportedLocale,
): LocalizedDomainCode {
  const params = (dc.params ?? {}) as TranslationParams;
  const message = i18n.translate(dc.code, params, locale);
  return { ...dc, message };
}

/**
 * Map an array of `DomainCode` to `LocalizedDomainCode[]` using one
 * `i18n` + `locale` pair. Convenience for validation responses that
 * carry many errors at once.
 */
export function localizeDomainCodes(
  codes: readonly DomainCode[],
  i18n: TranslationPort,
  locale: SupportedLocale,
): LocalizedDomainCode[] {
  return codes.map((dc) => localizeDomainCode(dc, i18n, locale));
}

/**
 * Build a `DomainCode` from primitives — saves callers from sprinkling
 * object literals when constructing many at once. The `params` argument is
 * narrowed to `DomainCodeParam` values so accidental object/function
 * params surface at the type level, not at translate time.
 */
export function domainCode(
  code: string,
  params?: Readonly<Record<string, DomainCodeParam>>,
): DomainCode {
  return params ? { code, params } : { code };
}
