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
import { AuthExtractorPort, type RawAuthRequest } from '@/shared-kernel/http/auth-extractor.port';
import type { UserPayload } from '@/shared-kernel/http/context';

interface JwtPayloadShape {
  readonly sub?: string;
  readonly userId?: string;
  readonly email?: string;
  readonly emailVerified?: boolean;
}

export interface JoseAuthExtractorConfig {
  /** Cookie name carrying the access token (e.g. `access_token`). */
  readonly cookieName?: string;
}

export class JoseAuthExtractorAdapter extends AuthExtractorPort {
  constructor(
    private readonly jwt: JwtPort,
    private readonly config: JoseAuthExtractorConfig = {},
  ) {
    super();
  }

  async extract(req: RawAuthRequest): Promise<UserPayload | null> {
    const token = this.readToken(req);
    if (!token) return null;
    const payload = await this.jwt.verifyAsync<JwtPayloadShape>(token);
    const userId = payload.userId ?? payload.sub;
    if (!userId) return null;
    return {
      userId,
      email: payload.email ?? '',
      emailVerified: payload.emailVerified,
    };
  }

  private readToken(req: RawAuthRequest): string | undefined {
    const auth = req.headers.authorization ?? req.headers.Authorization;
    const header = Array.isArray(auth) ? auth[0] : auth;
    if (header?.toLowerCase().startsWith('bearer ')) {
      return header.slice(7).trim() || undefined;
    }
    const cookieName = this.config.cookieName ?? 'access_token';
    return req.cookies?.[cookieName];
  }
}
