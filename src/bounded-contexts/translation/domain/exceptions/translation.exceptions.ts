/**
 * Translation Bounded Context Exceptions
 *
 * Wraps the LLM-based translation provider (TranslationLlmPort from
 * the BC AI) used by resume / text / batch translation.
 */
import { DomainException, ValidationException } from '@/shared-kernel/exceptions';

export class TranslationBackendUnavailableException extends DomainException {
  readonly code: string = 'TRANSLATION_BACKEND_UNAVAILABLE';
  readonly statusHint = 503;
  constructor(detail?: string, cause?: unknown) {
    super(
      detail
        ? `Translation backend is temporarily unavailable (${detail})`
        : 'Translation backend is temporarily unavailable',
      { cause },
    );
  }
}

export class UnsupportedLocalePairException extends ValidationException {
  override readonly code: string = 'UNSUPPORTED_LOCALE_PAIR';
  constructor(from: string, to: string) {
    super(`Translation from ${from} to ${to} is not supported`);
  }
}

export class TranslationPayloadTooLargeException extends ValidationException {
  override readonly code: string = 'TRANSLATION_PAYLOAD_TOO_LARGE';
  constructor(maxChars: number) {
    super(`Translation payload exceeds limit of ${maxChars} characters`);
  }
}
