/**
 * ErrorEnvelope — the exact shape every non-2xx HTTP response carries.
 *
 * `code` is the stable SCREAMING_SNAKE_CASE identifier (was `error` before).
 * `message` is already translated in the negotiated locale.
 * `severity` is a UX hint so the frontend can route to toast/modal/banner/inline
 * without per-code mapping. `suggestedAction` lets the backend nudge the user
 * to a follow-up (e.g. "Atualizar plano", "Refazer onboarding").
 */

import type { TranslationParams } from './translation.port';

export type ErrorSeverity = 'toast' | 'modal' | 'banner' | 'inline' | 'silent';

export interface SuggestedAction {
  readonly label: string;
  readonly href?: string;
  readonly eventName?: string;
}

export interface FieldError {
  readonly path: ReadonlyArray<string | number>;
  readonly code: string;
  readonly params: TranslationParams;
  readonly message: string;
}

export interface ErrorEnvelope {
  readonly statusCode: number;
  readonly code: string;
  readonly message: string;
  readonly severity: ErrorSeverity;
  readonly suggestedAction?: SuggestedAction;
  readonly params: TranslationParams;
  readonly fields?: ReadonlyArray<FieldError>;
}
