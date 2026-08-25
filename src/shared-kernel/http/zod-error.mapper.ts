/**
 * Request-validation (ZodError) → HTTP 400 envelope, localized.
 *
 * Sibling of `error.mapper.ts` for the one failure that happens BEFORE a
 * handler runs: the route's body/query/params schema rejected the input.
 * Each Zod issue becomes one `fields[]` entry — `zodIssueToCode` picks the
 * stable `VALIDATION_DICTIONARY` code (+ `{min}`/`{max}`… params) and the
 * message is rendered in the negotiated locale, so the frontend renders
 * `fields[i].message` under the input verbatim.
 *
 * `severity: 'inline'` — field errors belong next to the field, never in a
 * toast (matches `ValidationException`).
 */

import type { ZodError } from 'zod';
import { negotiateLocale } from '@/bounded-contexts/platform/i18n/application/locale-negotiator';
import { zodIssueToCode } from '@/bounded-contexts/platform/i18n/application/zod-issue-to-code';
import type {
  ErrorEnvelope,
  FieldError,
} from '@/bounded-contexts/platform/i18n/domain/error-envelope';
import {
  MissingTranslationError,
  type TranslationPort,
} from '@/bounded-contexts/platform/i18n/domain/translation.port';
import type { MappedHttpError } from './error.mapper';

export const VALIDATION_ERROR_CODE = 'VALIDATION_ERROR';

export function mapZodErrorToHttp(
  error: ZodError,
  i18n: TranslationPort,
  acceptLanguageHeader: string | string[] | undefined,
): MappedHttpError {
  const negotiated = negotiateLocale(
    Array.isArray(acceptLanguageHeader) ? acceptLanguageHeader[0] : acceptLanguageHeader,
  );
  const locale = negotiated.locale;
  const headers: Record<string, string> = { 'Content-Language': locale };
  if (!negotiated.matched) headers.Vary = 'Accept-Language';

  try {
    const fields: FieldError[] = error.issues.map((issue) => {
      const converted = zodIssueToCode(issue);
      return {
        path: converted.path,
        code: converted.code,
        params: converted.params,
        message: i18n.translate(converted.code, converted.params, locale),
      };
    });
    const body: ErrorEnvelope = {
      statusCode: 400,
      code: VALIDATION_ERROR_CODE,
      message: i18n.translate(VALIDATION_ERROR_CODE, {}, locale),
      severity: 'inline',
      params: {},
      fields,
    };
    return { status: 400, headers, body };
  } catch (err) {
    if (err instanceof MissingTranslationError) {
      // Same crash-loud contract as the domain path: a code the catalog
      // doesn't know is a bug, and the parity spec should have caught it.
      const body: ErrorEnvelope = {
        statusCode: 500,
        code: 'INTERNAL_TRANSLATION_MISSING',
        message: `Missing translation for "${err.code}" in "${locale}"`,
        severity: 'silent',
        params: { code: err.code, locale },
      };
      return { status: 500, headers, body };
    }
    throw err;
  }
}
