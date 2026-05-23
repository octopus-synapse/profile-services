/**
 * Pure error → HTTP-response mapper. Lifted from
 * `src/shared-kernel/filters/domain-exception.filter.ts` so adapters
 * (Nest today, Elysia/Fastify tomorrow) can call it without importing
 * `@nestjs/common`. The Nest filter becomes a thin wrapper that calls
 * this and writes the result to its `Response`.
 *
 * Returns `null` when the error isn't a domain-known case — caller
 * should let it bubble to the framework's default 500 handler.
 *
 * The body shape is `{ code, message, severity, suggestedAction?, params, fields?, statusCode }`.
 * No `success: false` envelope — the HTTP status code already conveys "error".
 */

import { negotiateLocale } from '@/bounded-contexts/platform/i18n/application/locale-negotiator';
import type { ErrorEnvelope } from '@/bounded-contexts/platform/i18n/domain/error-envelope';
import {
  MissingTranslationError,
  type TranslationPort,
} from '@/bounded-contexts/platform/i18n/domain/translation.port';
import { DomainException, extractDomainCodeParams } from '../exceptions/domain.exceptions';
import { localizeDomainCode } from '../i18n/localize-domain-code';

export interface MappedHttpError {
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly body: ErrorEnvelope;
}

/**
 * Maps a thrown error + request locale into a structured HTTP response.
 * Returns `null` for unknown errors so the caller can fall back to the
 * framework's default error handler.
 */
export function mapDomainErrorToHttp(
  error: unknown,
  i18n: TranslationPort,
  acceptLanguageHeader: string | string[] | undefined,
): MappedHttpError | null {
  if (!(error instanceof DomainException)) return null;

  const negotiated = negotiateLocale(
    Array.isArray(acceptLanguageHeader) ? acceptLanguageHeader[0] : acceptLanguageHeader,
  );
  const locale = negotiated.locale;
  const status = error.statusHint;

  const headers: Record<string, string> = { 'Content-Language': locale };
  if (!negotiated.matched) headers.Vary = 'Accept-Language';

  // Unified i18n pipeline: build a `DomainCode` view of the exception and
  // hand it to `localizeDomainCode`. This is the same primitive route
  // handlers use when returning validation results in 200 bodies — single
  // path for "code → message" resolution.
  const params = extractDomainCodeParams(error);
  let localized: ReturnType<typeof localizeDomainCode>;
  try {
    localized = localizeDomainCode({ code: error.code, params }, i18n, locale);
  } catch (err) {
    if (err instanceof MissingTranslationError) {
      const envelope: ErrorEnvelope = {
        statusCode: 500,
        code: 'INTERNAL_TRANSLATION_MISSING',
        message: `Missing translation for "${error.code}" in "${locale}"`,
        severity: 'silent',
        params: { code: error.code, locale },
      };
      return { status: 500, headers, body: envelope };
    }
    throw err;
  }

  const envelope: ErrorEnvelope = {
    statusCode: status,
    code: localized.code,
    message: localized.message,
    severity: error.severity,
    suggestedAction: error.suggestedAction,
    params,
  };
  return { status, headers, body: envelope };
}
