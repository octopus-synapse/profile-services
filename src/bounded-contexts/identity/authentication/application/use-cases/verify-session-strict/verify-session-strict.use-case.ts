/**
 * Verify Session Strict Use Case
 *
 * "Strict" sibling of `ValidateSessionUseCase`. The original use case is
 * shaped for the cookie-based session endpoint where every failure mode
 * collapses into `{ success: false, user: null }` so the frontend can
 * decide between "logged out" and "needs verification".
 *
 * This strict variant is for callers that want the failure to surface as
 * a typed `DomainException` — e.g. service-to-service handlers, websocket
 * adapters, or any code path where returning a soft `null` would mask a
 * security-relevant signal. Each failure maps onto one of the orphan
 * authentication exception classes so the global filter can phrase a
 * locale-specific 401 instead of a generic "unauthorized".
 */

import { LoggerPort } from '@/shared-kernel';
import {
  InvalidTokenException,
  SessionExpiredException,
  SessionNotFoundException,
  TokenInvalidException,
  TokenVerificationFailedException,
} from '../../../domain/exceptions';
import {
  AuthenticationRepositoryPort,
  type SessionAuthUser,
  TokenGeneratorPort,
} from '../../../domain/ports';

export interface VerifySessionStrictInput {
  /** Raw bearer / session token from the request (no `Bearer ` prefix). */
  readonly token: string | null | undefined;
}

export class VerifySessionStrictUseCase {
  constructor(
    private readonly repository: AuthenticationRepositoryPort,
    private readonly tokenGenerator: TokenGeneratorPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(input: VerifySessionStrictInput): Promise<SessionAuthUser> {
    const { token } = input;
    if (!token || token.trim() === '') {
      // Distinct from `TokenInvalidException` — this codepath fires when the
      // request never carried a session cookie / Authorization header at all.
      throw new SessionNotFoundException();
    }

    let payload;
    try {
      payload = await this.tokenGenerator.verifySessionToken(token);
    } catch (err) {
      // Token failed JWT signature / issuer / audience checks. Don't echo
      // the JWT library message back to the client (info leak); log it for
      // operators and surface a typed `InvalidTokenException`.
      this.logger.debug(
        `Session token verification failed: ${err instanceof Error ? err.message : 'unknown'}`,
        'VerifySessionStrictUseCase',
      );
      throw new InvalidTokenException(
        err instanceof Error ? err.message : undefined,
      );
    }

    if (!payload) {
      throw new InvalidTokenException();
    }

    // `exp` is in seconds (RFC 7519); compare against now in seconds.
    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp && nowInSeconds > payload.exp) {
      throw new SessionExpiredException();
    }

    let userData: SessionAuthUser | null;
    try {
      userData = await this.repository.findSessionUser(payload.sub);
    } catch (err) {
      // The session-cache layer is unreachable. We fail closed here — the
      // session may or may not have been revoked, so accepting the JWT
      // would be a privilege-escalation hazard. Surface a typed exception
      // so the client retries instead of treating the user as authenticated.
      this.logger.warn(
        `Session repository lookup failed: ${err instanceof Error ? err.message : 'unknown'}`,
        'VerifySessionStrictUseCase',
      );
      throw new TokenVerificationFailedException();
    }

    if (!userData) {
      // JWT is well-formed but the user behind `sub` no longer exists
      // (deletion, hard ban). Distinct code so the frontend can decide
      // whether to clear local state or prompt for re-login.
      throw new TokenInvalidException(
        `User ${payload.sub} no longer exists`,
      );
    }

    return userData;
  }
}
