/**
 * I18nService
 *
 * Resolves `(code, params, locale)` to a localized message by looking the
 * code up in the `@packages/i18n` dictionary and interpolating `{param}`
 * placeholders from the supplied params. The dictionary is the source of
 * truth — no JSON loading, no runtime fetches, no locale fallback.
 *
 * Missing code → `MissingTranslationError` (which the filter converts to
 * 500/INTERNAL_TRANSLATION_MISSING). Missing param → warn log + placeholder
 * kept intact so the gap surfaces in staging, not silently in prod.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ERROR_DICTIONARY, type ErrorCode } from '@packages/i18n';
import {
  MissingTranslationError,
  type SupportedLocale,
  type TranslationParams,
  TranslationPort,
} from '../domain/translation.port';

const PLACEHOLDER_RE = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;

function isKnownCode(code: string): code is ErrorCode {
  return Object.hasOwn(ERROR_DICTIONARY, code);
}

@Injectable()
export class I18nService extends TranslationPort {
  private readonly logger = new Logger(I18nService.name);

  translate(code: string, params: TranslationParams, locale: SupportedLocale): string {
    if (!isKnownCode(code)) throw new MissingTranslationError(code, locale);
    const template = ERROR_DICTIONARY[code][locale];
    return this.interpolate(template, params, code, locale);
  }

  has(code: string, _locale: SupportedLocale): boolean {
    return isKnownCode(code);
  }

  private interpolate(
    template: string,
    params: TranslationParams,
    code: string,
    locale: SupportedLocale,
  ): string {
    return template.replace(PLACEHOLDER_RE, (_match, key: string) => {
      const value = params[key];
      if (value === undefined) {
        this.logger.warn(
          `i18n param "${key}" missing for code "${code}" (${locale}); leaving placeholder intact`,
        );
        return `{${key}}`;
      }
      if (value === null) return '';
      return String(value);
    });
  }

  /** Test / tooling helper — raw template for a code in a locale. */
  rawTemplate(code: string, locale: SupportedLocale): string | undefined {
    if (!isKnownCode(code)) return undefined;
    return ERROR_DICTIONARY[code][locale];
  }

  /** Test / tooling helper — sorted list of every code the dictionary knows. */
  allCodes(): ErrorCode[] {
    return Object.keys(ERROR_DICTIONARY).sort() as ErrorCode[];
  }
}
