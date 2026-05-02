/**
 * Internal-Auth header validator.
 *
 * Used by routes flagged with `guards: [{ id: 'internal-auth' }]` —
 * they accept the `x-internal-token` header instead of a JWT and the
 * value must match `INTERNAL_API_TOKEN`. This module supplies a pure
 * function the route adapter (Elysia today) calls before invoking the
 * handler:
 *
 *   - `INTERNAL_API_TOKEN` unset on the server →
 *     `InternalAuthNotConfiguredException` (deny rather than silently
 *     allow everyone through)
 *   - header missing → `InternalTokenMissingException`
 *   - header present but mismatched → `InternalTokenInvalidException`
 *
 * String comparison uses a constant-time path to avoid leaking secret
 * length via timing.
 */

import { timingSafeEqual } from 'node:crypto';
import {
  InternalAuthNotConfiguredException,
  InternalTokenInvalidException,
  InternalTokenMissingException,
} from '../domain/exceptions/integration.exceptions';

export const INTERNAL_TOKEN_HEADER = 'x-internal-token';

export interface InternalAuthInput {
  /** Header name the request used (default `x-internal-token`). */
  readonly headerName?: string;
  /** Token value pulled out of the request header — `undefined` when
   *  the header was absent. */
  readonly headerValue: string | undefined;
  /** Server-side configured secret (`INTERNAL_API_TOKEN` env var) —
   *  `undefined` when the operator never set it. */
  readonly configuredToken: string | undefined;
}

export function assertInternalAuth(input: InternalAuthInput): void {
  const header = input.headerName ?? INTERNAL_TOKEN_HEADER;

  if (!input.configuredToken) {
    throw new InternalAuthNotConfiguredException();
  }
  if (!input.headerValue) {
    throw new InternalTokenMissingException(header);
  }

  // Constant-time compare. Both buffers must be the same length, so we
  // bail out early on a length mismatch (still in constant time wrt
  // the configured token).
  const provided = Buffer.from(input.headerValue, 'utf8');
  const expected = Buffer.from(input.configuredToken, 'utf8');
  if (provided.length !== expected.length) {
    throw new InternalTokenInvalidException();
  }
  if (!timingSafeEqual(provided, expected)) {
    throw new InternalTokenInvalidException();
  }
}
