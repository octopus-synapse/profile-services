/**
 * Success-message envelope and rendering helper.
 *
 * Q8 in the duplication audit. Routes that previously returned
 * inline `{ message: 'X deleted successfully.' }` strings now return
 * `{ code: 'X_DELETED', params? }` and a small interceptor on the
 * adapter side translates via `renderSuccessMessage` using the
 * caller's Accept-Language header.
 *
 * The Zod envelope is exported so route descriptors can declare the
 * canonical wire shape:
 *   `response: SuccessMessageResponseSchema`
 *
 * The full Elysia interceptor wiring lives in
 * `src/infrastructure/elysia-adapter/elysia-route-mounter.ts` (TODO —
 * piggyback on the same `Accept-Language` plumbing the error mapper
 * already uses).
 */

import { z } from 'zod';
import {
  renderSuccessMessage,
  type SuccessMessageCode,
} from '@packages/i18n';
import { negotiateLocale } from '@/bounded-contexts/platform/i18n/application/locale-negotiator';

/**
 * What handlers return. Renamed from `SuccessMessage` to avoid the
 * name clash with the legacy hard-coded EN-only string-literal union
 * in `shared-kernel/constants/success-messages.const.ts`. Once that
 * legacy constant is fully retired this can shed the suffix.
 */
export interface SuccessMessageEnvelope {
  readonly code: SuccessMessageCode | string;
  readonly params?: Record<string, string | number | boolean>;
}

/** What clients receive after the response interceptor renders the code. */
export const SuccessMessageResponseSchema = z.object({
  message: z.string(),
});

export type SuccessMessageResponse = z.infer<typeof SuccessMessageResponseSchema>;

/**
 * Translate a `SuccessMessage` into a response body using the request's
 * Accept-Language header. Mirrors the locale-negotiation flow used by
 * the canonical error mapper.
 */
export function renderSuccessMessageForRequest(
  envelope: SuccessMessageEnvelope,
  acceptLanguageHeader: string | string[] | undefined,
): SuccessMessageResponse {
  const negotiated = negotiateLocale(
    Array.isArray(acceptLanguageHeader) ? acceptLanguageHeader[0] : acceptLanguageHeader,
  );
  return {
    message: renderSuccessMessage(envelope.code, envelope.params ?? {}, negotiated.locale),
  };
}

/** Type-guard so adapters can detect the envelope before serialising. */
export function isSuccessMessage(value: unknown): value is SuccessMessageEnvelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { code?: unknown }).code === 'string' &&
    !('message' in value)
  );
}
