/**
 * `DomainCode` — the unified i18n primitive.
 *
 * A `DomainCode` is a typed identifier for "something the domain has to say
 * to the user", paired with the params needed to interpolate the message
 * template. It is shared by:
 *
 *   - `DomainException` (thrown → HTTP 4xx via `mapDomainErrorToHttp`)
 *   - Validation results returned in 200 bodies (e.g. `ValidateUsernameUseCase`
 *     returns `errors: DomainCode[]` for the multi-error UX where the form
 *     wants to show every problem at once).
 *
 * Either path eventually reaches `localizeDomainCode(dc, i18n, locale)`,
 * which interpolates the catalog entry from `@packages/i18n/ERROR_DICTIONARY`
 * using the request's `Accept-Language`. The frontend therefore always
 * receives `{ code, message, params }` with `message` already in the user's
 * language — independent of HTTP status.
 *
 * `code` is a string (not the catalog union) so domain code that adds a new
 * code can build the value without touching the dictionary first; the
 * `localize` step throws `MissingTranslationError` if the catalog is out of
 * sync — which is what we want.
 */

import type { ErrorSeverity } from '@/bounded-contexts/platform/i18n/domain/error-envelope';

export type DomainCodeParam = string | number | boolean | null;

export interface DomainCode {
  /** Catalog key — matches an entry in `@packages/i18n/ERROR_DICTIONARY`. */
  readonly code: string;
  /** Interpolation params for the catalog template's `{name}` placeholders. */
  readonly params?: Readonly<Record<string, DomainCodeParam>>;
  /** UX hint. Defaults to `'inline'` for validation results when omitted. */
  readonly severity?: ErrorSeverity;
}

/**
 * `DomainCode` enriched with a resolved, locale-specific `message`.
 * Returned by `localizeDomainCode` and embedded in HTTP responses.
 */
export interface LocalizedDomainCode extends DomainCode {
  readonly message: string;
}
