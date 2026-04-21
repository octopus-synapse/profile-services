/**
 * I18nService — phase 1 placeholder.
 *
 * Not wired as the concrete TranslationPort yet because the catalog JSONs
 * arrive in phase 3. This file exists so consumers (exception filter,
 * workers) can already take a dependency on the port symbol without
 * rewriting imports later.
 */

import { Injectable } from '@nestjs/common';
import {
  MissingTranslationError,
  type SupportedLocale,
  type TranslationParams,
  TranslationPort,
} from '../domain/translation.port';

@Injectable()
export class I18nService extends TranslationPort {
  translate(code: string, _params: TranslationParams, locale: SupportedLocale): string {
    // Phase 1: no catalog loaded. Every call crashes loudly so the tree of
    // callers is forced to light up in tests when phase 2 starts wiring.
    throw new MissingTranslationError(code, locale);
  }

  has(_code: string, _locale: SupportedLocale): boolean {
    return false;
  }
}
