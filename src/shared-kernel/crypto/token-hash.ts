/**
 * SHA-256 token fingerprint for storage. Used by password-reset, refresh and
 * email-verification tokens so a leaked DB never returns usable tokens —
 * the user gets the plaintext over their own channel (email / Set-Cookie)
 * and the server only ever stores the digest.
 *
 * Lookups must use the same `hashToken(plain)` and query by hash. Lookup-by-
 * plaintext is impossible by design.
 */

import { createHash } from 'node:crypto';

export function hashToken(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}
