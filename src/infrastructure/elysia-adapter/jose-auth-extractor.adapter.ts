/**
 * `AuthExtractorPort` impl that resolves a `UserPayload` from a
 * Bearer token (`Authorization` header) or a session cookie. JWT is
 * verified through the `JwtPort` so the secret/issuer/audience config
 * is consistent with sign-side use cases.
 *
 * Returns `null` when no credentials are present. Throws when
 * credentials exist but are invalid — the pipeline maps it to 401 via
 * the existing `mapDomainErrorToHttp` flow.
 */

import type { JwtPort } from '@/shared-kernel/auth/jwt.port';
import type { CachePort } from '@/shared-kernel/cache/cache.port';
import { AuthExtractorPort, type RawAuthRequest } from '@/shared-kernel/http/auth-extractor.port';
import type { UserPayload } from '@/shared-kernel/http/context';
import type { UserSnapshotPort } from '@/shared-kernel/http/user-snapshot.port';

interface JwtPayloadShape {
  readonly sub?: string;
  readonly userId?: string;
  readonly email?: string;
  readonly emailVerified?: boolean;
  readonly iat?: number;
}

export interface JoseAuthExtractorConfig {
  /** Cookie name carrying the access token (e.g. `access_token`). */
  readonly cookieName?: string;
}

const TOKEN_VALID_AFTER_KEY_PREFIX = 'auth:token_valid_after:';

export class JoseAuthExtractorAdapter extends AuthExtractorPort {
  constructor(
    private readonly jwt: JwtPort,
    private readonly config: JoseAuthExtractorConfig = {},
    private readonly userSnapshot?: UserSnapshotPort,
    private readonly cache?: CachePort,
  ) {
    super();
  }

  async extract(req: RawAuthRequest): Promise<UserPayload | null> {
    const token = this.readToken(req);
    if (!token) return null;
    const payload = await this.jwt.verifyAsync<JwtPayloadShape>(token);
    const userId = payload.userId ?? payload.sub;
    if (!userId) return null;

    // Session-invalidation gate: reset-password / change-password write
    // a `token_valid_after` timestamp into the cache; any JWT issued at
    // or before that timestamp is rejected so old sessions die at once.
    if (this.cache?.isEnabled && typeof payload.iat === 'number') {
      const validAfter = await this.cache.get<number>(`${TOKEN_VALID_AFTER_KEY_PREFIX}${userId}`);
      if (typeof validAfter === 'number' && payload.iat <= validAfter) {
        return null;
      }
    }

    // Refresh `emailVerified` + `hasCompletedOnboarding` from DB so
    // gate stages don't operate on stale token-time snapshots (a user
    // can verify their email or finish onboarding mid-session).
    if (this.userSnapshot) {
      const snap = await this.userSnapshot.get(userId);
      if (!snap) return null;
      return {
        userId: snap.userId,
        email: snap.email || payload.email || '',
        emailVerified: snap.emailVerified,
        hasCompletedOnboarding: snap.hasCompletedOnboarding,
      };
    }

    return {
      userId,
      email: payload.email ?? '',
      emailVerified: payload.emailVerified,
    };
  }

  private readToken(req: RawAuthRequest): string | undefined {
    // Cookie takes precedence over Authorization Bearer so server-side
    // sessions (set on login) win over any client-supplied header. The
    // session-auth e2e journey pins this contract.
    const cookieName = this.config.cookieName ?? 'access_token';
    const cookieToken = req.cookies?.[cookieName];
    if (cookieToken) return cookieToken;
    const auth = req.headers.authorization ?? req.headers.Authorization;
    const header = Array.isArray(auth) ? auth[0] : auth;
    if (header?.toLowerCase().startsWith('bearer ')) {
      return header.slice(7).trim() || undefined;
    }
    return undefined;
  }
}
