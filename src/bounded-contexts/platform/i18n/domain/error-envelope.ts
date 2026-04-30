/**
 * ErrorEnvelope — the exact shape every non-2xx HTTP response carries.
 *
 * Kept intentionally small: a stable code, the translated message in the
 * negotiated locale, the params used for translation (so the client can
 * re-translate or inspect), and optional field-level detail.
 *
 * `statusCode` mirrors the HTTP status for convenience when a logged
 * payload is inspected in isolation.
 */

import type { TranslationParams } from './translation.port';

export interface FieldError {
  readonly path: ReadonlyArray<string | number>;
  readonly code: string;
  readonly params: TranslationParams;
  readonly message: string;
}

export interface ErrorEnvelope {
  readonly statusCode: number;
  readonly error: string; // stable CODE
  readonly message: string; // already translated in negotiated locale
  readonly params: TranslationParams;
  readonly fields?: ReadonlyArray<FieldError>;
}
