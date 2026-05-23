/**
 * CSPRNG helpers for secrets that must resist guessing — backup codes,
 * one-time codes, ephemeral tokens. Built on `crypto.randomInt` so the
 * underlying entropy comes from the OS CSPRNG, NEVER `Math.random` (P1
 * #1: a 36-char Math.random alphabet gives ~5 bits of entropy per char
 * because V8 leaks state from the xorshift PRNG, so 8-char backup codes
 * collapse to ~40 effective bits, well within reach of a motivated
 * attacker who knows the format).
 *
 * Rejection sampling on top of `randomInt(0, max)` keeps the output
 * uniform across non-power-of-two alphabets. `randomInt` itself already
 * rejects out-of-range samples, so this wrapper just iterates length
 * times and concatenates the picks.
 */

import { randomInt } from 'node:crypto';

/** Default alphabet used when callers don't supply one. Crockford-style:
 *  numerals + uppercase letters. Avoids visually-ambiguous characters
 *  (`O`/`0`, `I`/`1`) on purpose — easier for a user to type a backup
 *  code off a piece of paper. */
export const DEFAULT_RANDOM_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generate a random string of `length` characters drawn uniformly from
 * `alphabet`. Each character is sampled via `crypto.randomInt`, so the
 * result is suitable for backup codes, OTP secrets, and any other case
 * where a `Math.random`-backed value would be exploitable.
 *
 * @throws `RangeError` when `length < 1` or the alphabet is empty.
 */
export function secureRandomCode(length: number, alphabet?: string): string {
  if (length < 1) {
    throw new RangeError(`secureRandomCode: length must be >= 1, got ${length}`);
  }
  const alpha = alphabet ?? DEFAULT_RANDOM_ALPHABET;
  if (alpha.length === 0) {
    throw new RangeError('secureRandomCode: alphabet must be non-empty');
  }
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alpha.charAt(randomInt(0, alpha.length));
  }
  return out;
}
