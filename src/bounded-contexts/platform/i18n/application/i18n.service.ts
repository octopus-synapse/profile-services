/**
 * I18nService
 *
 * Resolves `(code, params, locale)` to a localized message by looking the
 * code up in the `@packages/i18n` dictionary and interpolating `{ param }`
 * placeholders from the supplied params. The dictionary is the source of
 * truth — no JSON loading, no runtime fetches, no locale fallback.
 *
 * Missing code → `MissingTranslationError` (which the filter converts to
 * 500/INTERNAL_TRANSLATION_MISSING). Missing param → warn log + placeholder
 * kept intact so the gap surfaces in staging, not silently in prod.
 */

import {
  ERROR_DICTIONARY,
  type ErrorCode,
  VALIDATION_DICTIONARY,
  type ValidationCode,
} from '@packages/i18n';
import { LoggerPort } from '@/shared-kernel/logger';
import {
  type Locale,
  MissingTranslationError,
  type TranslationParams,
  TranslationPort,
} from '../domain/translation.port';

const PLACEHOLDER_RE = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;

type KnownCode = ErrorCode | ValidationCode;

// Two catalogs, one lookup: domain-exception codes and request-validation
// codes (zod issues → `fields[]`). Key-sets are disjoint by spec, so order
// is irrelevant; ERROR first only because it's the hot path.
function lookup(code: string): Readonly<Record<string, string>> | undefined {
  if (Object.hasOwn(ERROR_DICTIONARY, code)) return ERROR_DICTIONARY[code as ErrorCode];
  if (Object.hasOwn(VALIDATION_DICTIONARY, code))
    return VALIDATION_DICTIONARY[code as ValidationCode];
  return undefined;
}

function isKnownCode(code: string): code is KnownCode {
  return lookup(code) !== undefined;
}

export class I18nService extends TranslationPort {
  constructor(private readonly logger: LoggerPort) {
    super();
  }

  translate(code: string, params: TranslationParams, locale: Locale): string {
    const entry = lookup(code);
    if (!entry) throw new MissingTranslationError(code, locale);
    const template = entry[locale];
    return this.interpolate(template, params, code, locale);
  }

  has(code: string, _locale: Locale): boolean {
    return isKnownCode(code);
  }

  private interpolate(
    template: string,
    params: TranslationParams,
    code: string,
    locale: Locale,
  ): string {
    return template.replace(PLACEHOLDER_RE, (_match, key: string) => {
      const value = params[key];
      if (value === undefined) {
        this.logger.warn(
          `i18n param "${key}" missing for code "${code}" (${locale}); leaving placeholder intact`,
          'I18nService',
        );
        return `{${key}}`;
      }
      if (value === null) return '';
      return String(value);
    });
  }

  /** Test / tooling helper — raw template for a code in a locale. */
  rawTemplate(code: string, locale: Locale): string | undefined {
    return lookup(code)?.[locale];
  }

  /** Test / tooling helper — sorted list of every code the catalogs know. */
  allCodes(): KnownCode[] {
    return [
      ...Object.keys(ERROR_DICTIONARY),
      ...Object.keys(VALIDATION_DICTIONARY),
    ].sort() as KnownCode[];
  }
}
