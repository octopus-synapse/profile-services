/**
 * Registration continuation token — proof that an e-mail was verified in
 * the pre-signup flow (identifier-first: e-mail → code → password). The
 * confirm step issues it, `POST /v1/accounts` consumes it to create the
 * account with `emailVerified` already set.
 *
 * Built on `signState`/`verifyState` (HMAC-SHA256, stateless, TTL'd).
 * The e-mail is base64url-encoded because the signed-state wire format
 * is dot-separated and e-mails contain dots; a purpose prefix inside the
 * value keeps other signed-state artifacts (OAuth `state`, etc.) from
 * being replayed here.
 */

import { signState, verifyState } from './signed-state-cookie';

const PURPOSE_PREFIX = 'pre-signup-verified:';

/** Long enough to read the terms and type a password; short enough to cap replay. */
export const REGISTRATION_TOKEN_TTL_MS = 30 * 60 * 1000;

export function issueRegistrationToken(email: string, secret: string): string {
  const value = Buffer.from(`${PURPOSE_PREFIX}${email}`, 'utf8').toString('base64url');
  return signState(value, secret);
}

/** Returns the verified e-mail, or `null` for anything invalid/expired/foreign. */
export function verifyRegistrationToken(
  token: string,
  secret: string,
  now?: () => number,
): string | null {
  const value = verifyState(token, {
    secret,
    ttlMs: REGISTRATION_TOKEN_TTL_MS,
    ...(now ? { now } : {}),
  });
  if (!value) return null;
  const decoded = Buffer.from(value, 'base64url').toString('utf8');
  if (!decoded.startsWith(PURPOSE_PREFIX)) return null;
  const email = decoded.slice(PURPOSE_PREFIX.length);
  return email.length > 0 ? email : null;
}
