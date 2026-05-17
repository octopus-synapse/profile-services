/**
 * HMAC-signed state cookies for short-lived multi-step flows (OAuth `state`,
 * email-verification challenge tokens, etc.). The cookie carries the raw
 * value plus an issued-at timestamp and a SHA-256 HMAC signature. Verifying
 * a cookie checks the signature, then enforces a TTL.
 *
 * Format (urlsafe base64):
 *   `<value>.<issuedAtMs>.<base64url(hmacSha256(secret, "<value>.<issuedAtMs>"))>`
 *
 * Use cases:
 *   - OAuth state: 10 min TTL, value = random hex
 *   - Email verify continuation: 5 min TTL, value = userId
 *
 * The signature uses a timing-safe compare. Returns `null` on any failure
 * (malformed, bad signature, expired) so callers can branch with one check.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

function base64url(buf: Buffer): string {
  return buf.toString('base64url');
}

function fromBase64url(s: string): Buffer {
  // `Buffer.from(_, 'base64url')` is non-throwing — bytes that aren't valid
  // base64 are silently dropped, yielding a (possibly empty / wrong-length)
  // buffer. We rely on the subsequent length + timingSafeEqual checks in
  // `verifyState` to reject those.
  return Buffer.from(s, 'base64url');
}

/**
 * Sign a `value` for storage in a cookie. The returned string is opaque to
 * callers and ALWAYS includes the issuance timestamp + signature.
 */
export function signState(value: string, secret: string): string {
  const issuedAtMs = Date.now();
  const payload = `${value}.${issuedAtMs}`;
  const sig = createHmac('sha256', secret).update(payload).digest();
  return `${payload}.${base64url(sig)}`;
}

export interface VerifyStateOptions {
  readonly secret: string;
  readonly ttlMs: number;
  /** Optional now() injection for tests. */
  readonly now?: () => number;
}

/**
 * Verify a previously-signed cookie. Returns the original `value` if the
 * signature is valid and the TTL has not elapsed; `null` otherwise.
 *
 * Timing-safe comparison prevents tag length / byte-by-byte side channels.
 */
export function verifyState(cookie: string | undefined, opts: VerifyStateOptions): string | null {
  if (!cookie) return null;
  const parts = cookie.split('.');
  if (parts.length !== 3) return null;
  const [value, issuedAtRaw, sigRaw] = parts;
  if (!value || !issuedAtRaw || !sigRaw) return null;

  const issuedAtMs = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAtMs)) return null;

  const now = opts.now?.() ?? Date.now();
  if (now - issuedAtMs > opts.ttlMs) return null;
  // Reject cookies from the future (clock skew protection — ±2min tolerance).
  if (issuedAtMs - now > 2 * 60 * 1000) return null;

  const expected = createHmac('sha256', opts.secret).update(`${value}.${issuedAtMs}`).digest();
  const actual = fromBase64url(sigRaw);
  if (actual.length !== expected.length) return null;
  if (!timingSafeEqual(actual, expected)) return null;

  return value;
}
