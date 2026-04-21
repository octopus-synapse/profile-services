/**
 * I18nService
 *
 * Loads the JSON error catalogs at module init and resolves
 * `(code, params, locale)` to a localized message by:
 *   1. Looking up `catalog[locale][code]`.
 *   2. If present and the template has `{param}` placeholders, interpolate
 *      using the supplied params. Unknown placeholders are left intact so
 *      logs can reveal the missing param instead of silently swallowing it.
 *   3. If absent, throw `MissingTranslationError` — the filter converts that
 *      to a 500/INTERNAL. Zero silent fallbacks.
 *
 * Supported placeholder syntax: `{name}`. Values are coerced with String(v).
 * Null / undefined params resolve to empty string.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  MissingTranslationError,
  type SupportedLocale,
  type TranslationParams,
  TranslationPort,
} from '../domain/translation.port';
import {
  type Catalog,
  type CatalogsByLocale,
  loadErrorCatalogs,
} from '../infrastructure/json-catalog-loader';

const PLACEHOLDER_RE = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;

@Injectable()
export class I18nService extends TranslationPort {
  private readonly logger = new Logger(I18nService.name);
  private readonly catalogs: CatalogsByLocale = loadErrorCatalogs();

  translate(code: string, params: TranslationParams, locale: SupportedLocale): string {
    const catalog = this.catalogs[locale];
    const template = catalog[code];
    if (template === undefined) {
      throw new MissingTranslationError(code, locale);
    }
    return this.interpolate(template, params, code, locale);
  }

  has(code: string, locale: SupportedLocale): boolean {
    return Object.hasOwn(this.catalogs[locale], code);
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

  /** Test / tooling helper — returns raw template without interpolation. */
  rawTemplate(code: string, locale: SupportedLocale): string | undefined {
    const cat: Catalog | undefined = this.catalogs[locale];
    return cat?.[code];
  }

  /** Test / tooling helper — all codes that have an entry in this locale. */
  allCodes(locale: SupportedLocale): string[] {
    return Object.keys(this.catalogs[locale]).sort();
  }
}
