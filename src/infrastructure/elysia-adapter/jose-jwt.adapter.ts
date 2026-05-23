/**
 * `JwtPort` impl backed by `jose`. Web Crypto under the hood — works
 * natively on Bun without any platform shims. Mirrors the surface of
 * the Nest `JwtService`-backed adapter: HS256 secret keys + the same
 * sign/verify semantics, including string `expiresIn` (`'15m'`) and
 * `audience`/`issuer` claims.
 *
 * Synchronous `sign`/`verify` are kept for API parity with `JwtService`,
 * but jose is async-first; the sync methods spin up a tiny event-loop
 * via Bun's `await` runner. Application code is encouraged to use the
 * `*Async` variants — every existing call site already does.
 */

import { type JWTPayload, errors as joseErrors, jwtVerify, SignJWT } from 'jose';
import { JwtPort, type JwtSignOptions, type JwtVerifyOptions } from '@/shared-kernel/auth/jwt.port';

/**
 * `expiresIn`: relative duration ("15m") or relative seconds-from-now
 * (number). Always returns an absolute epoch-seconds value computed
 * against `Date.now()` — i.e. "this many seconds **from now**".
 */
function parseExpiresIn(expiresIn: string | number): number {
  if (typeof expiresIn === 'number') return Math.floor(Date.now() / 1000) + expiresIn;
  // jose understands strings like '15m', '7d' via `setExpirationTime` directly.
  // Convert here so we always emit a numeric `exp` claim.
  const match = /^(\d+)\s*(s|m|h|d)$/.exec(expiresIn.trim());
  if (!match) {
    const asNumber = Number(expiresIn);
    if (Number.isFinite(asNumber)) return Math.floor(Date.now() / 1000) + asNumber;
    throw new Error(`Invalid expiresIn: ${expiresIn}`);
  }
  const n = Number(match[1]);
  const unit = match[2];
  const seconds = n * (unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400);
  return Math.floor(Date.now() / 1000) + seconds;
}

/**
 * P1 #47 — `notBefore` has different semantics than `expiresIn`:
 *
 *   - `"1h"` / `"30s"` (string) → "valid from one hour from now",
 *     i.e. duration relative to `Date.now()`. Reuse `parseExpiresIn`.
 *   - `1700000000` (number)   → **absolute** epoch seconds. The old
 *     code routed numbers through `parseExpiresIn` too, which added
 *     `Date.now()` and produced a `nbf` ~54 years in the future.
 *     Callers issuing pre-dated tokens (cron-scheduled actions, deferred
 *     consent flows) saw the resulting JWT silently rejected as "not
 *     yet valid" forever.
 *
 * Numbers therefore pass through unchanged; strings keep duration
 * semantics for backwards compatibility with the few call sites that
 * mirrored `expiresIn`.
 */
function parseNotBefore(notBefore: string | number): number {
  if (typeof notBefore === 'number') return Math.floor(notBefore);
  return parseExpiresIn(notBefore);
}

export interface JoseJwtConfig {
  /** Default secret used when a per-call options.secret is not provided. */
  readonly secret: string;
  /**
   * Optional previous secret accepted by the verifier during a rotation
   * window. The signer always uses `secret`. When configured, verification
   * tries `secret` first and falls back to `previousSecret` only on
   * signature mismatch — every other failure (expired, audience, issuer,
   * shape) surfaces unchanged.
   */
  readonly previousSecret?: string;
  readonly issuer?: string;
  readonly audience?: string;
}

export class JoseJwtAdapter extends JwtPort {
  constructor(private readonly config: JoseJwtConfig) {
    super();
  }

  private secretKey(secret?: string): Uint8Array {
    return new TextEncoder().encode(secret ?? this.config.secret);
  }

  sign(_payload: object, _options: JwtSignOptions = {}): string {
    // jose has no sync API. Sync sign is unused across the codebase;
    // route handlers exclusively call `signAsync`. Throwing here is
    // safer than a deasync hack and makes any accidental sync use
    // surface immediately.
    throw new Error('JoseJwtAdapter.sign is not supported — use signAsync.');
  }

  async signAsync(payload: object, options: JwtSignOptions = {}): Promise<string> {
    const builder = new SignJWT(payload as JWTPayload).setProtectedHeader({ alg: 'HS256' });
    if (options.expiresIn !== undefined)
      builder.setExpirationTime(parseExpiresIn(options.expiresIn));
    const issuer = options.issuer ?? this.config.issuer;
    if (issuer) builder.setIssuer(issuer);
    const audience = options.audience ?? this.config.audience;
    if (audience) builder.setAudience(audience);
    if (options.subject) builder.setSubject(options.subject);
    if (options.notBefore !== undefined) builder.setNotBefore(parseNotBefore(options.notBefore));
    builder.setIssuedAt();
    return builder.sign(this.secretKey(options.secret));
  }

  verify<T = unknown>(_token: string, _options?: JwtVerifyOptions): T {
    throw new Error('JoseJwtAdapter.verify is not supported — use verifyAsync.');
  }

  async verifyAsync<T = unknown>(token: string, options: JwtVerifyOptions = {}): Promise<T> {
    const verifyOptions = {
      issuer: options.issuer ?? this.config.issuer,
      audience: options.audience ?? this.config.audience,
    };
    try {
      const { payload } = await jwtVerify(token, this.secretKey(options.secret), verifyOptions);
      return payload as T;
    } catch (err) {
      // A per-call secret bypasses the rotation window. So does an unset
      // `previousSecret`. Any other failure (expired, audience, issuer)
      // is genuine — surface it.
      const isSignatureFailure = err instanceof joseErrors.JWSSignatureVerificationFailed;
      if (!isSignatureFailure || options.secret || !this.config.previousSecret) {
        throw err;
      }
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(this.config.previousSecret),
        verifyOptions,
      );
      return payload as T;
    }
  }

  decode<T = unknown>(token: string): T | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
      const payload = parts[1];
      const json = Buffer.from(payload, 'base64url').toString('utf8');
      return JSON.parse(json) as T;
    } catch {
      return null;
    }
  }
}
