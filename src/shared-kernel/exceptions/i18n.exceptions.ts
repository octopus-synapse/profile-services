/**
 * i18n Exceptions
 *
 * Surfaced when translation catalogs fail at runtime: missing key,
 * unsupported locale, malformed entry. Previously the error mapper
 * swallowed these inline (Q16 in the duplication audit) — now they are
 * first-class domain exceptions that the mapper can throw and any
 * caller can catch.
 *
 * All map to HTTP 500 because they indicate a server-side catalog
 * inconsistency, not a client error.
 */

import { DomainException } from './domain.exceptions';

export class MissingTranslationException extends DomainException {
  readonly code: string = 'INTERNAL_TRANSLATION_MISSING';
  readonly statusHint = 500;

  constructor(
    public readonly translationKey: string,
    public readonly locale: string,
  ) {
    super(`Missing translation for key "${translationKey}" in locale "${locale}"`);
  }
}

export class UnsupportedLocaleException extends DomainException {
  readonly code: string = 'INTERNAL_UNSUPPORTED_LOCALE';
  readonly statusHint = 500;

  constructor(public readonly locale: string) {
    super(`Locale "${locale}" is not supported`);
  }
}

export class MalformedTranslationException extends DomainException {
  readonly code: string = 'INTERNAL_MALFORMED_TRANSLATION';
  readonly statusHint = 500;

  constructor(
    public readonly translationKey: string,
    public readonly reason: string,
  ) {
    super(`Malformed translation entry for "${translationKey}": ${reason}`);
  }
}
