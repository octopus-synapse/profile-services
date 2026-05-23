import type { LoggerPort } from '@/shared-kernel';
import { SessionExchangeInvalidException } from '../../../domain/exceptions';
import type { AuthenticationRepositoryPort, TokenGeneratorPort } from '../../../domain/ports';
import type { SessionExchangePort } from '../../ports/session-exchange.port';

// Refresh token expiration: 7 days (matches LoginUseCase + RefreshTokenUseCase).
const REFRESH_TOKEN_DAYS = 7;

export interface ExchangeSessionForTokensCommand {
  readonly sessionExchangeId: string;
}

export interface ExchangeSessionForTokensResult {
  readonly userId: string;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresIn: number;
}

/**
 * V2 D42 — One-shot exchange flow for native clients.
 *
 * Native clients opt out of cookie-based auth via `Accept-Mode: tokens`
 * on POST /v1/auth/login (or /verify-2fa). Post-#231 the login response
 * no longer carries tokens in its body, so the mobile app would be
 * stranded: no cookie, no tokens. This use case closes that gap.
 *
 * Flow:
 *   1. Login handler issues an opaque `sessionExchangeId` and stores
 *      `{userId, email}` in `SessionExchangePort` with a 60s TTL.
 *   2. Mobile client immediately calls `POST /v1/auth/session/tokens`
 *      with the id.
 *   3. This use case atomically consumes the id (one-shot — second
 *      caller hits cache miss → `SessionExchangeInvalidException`),
 *      mints a fresh access/refresh pair via `TokenGeneratorPort`, and
 *      persists the refresh token in the repository so the existing
 *      rotation flow continues to work.
 *
 * The exchange is intentionally short-lived (60s) so a leaked id is
 * already useless by the time anyone outside the legitimate client
 * could replay it.
 */
export class ExchangeSessionForTokensUseCase {
  constructor(
    private readonly sessionExchange: SessionExchangePort,
    private readonly tokenGenerator: TokenGeneratorPort,
    private readonly repository: AuthenticationRepositoryPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(command: ExchangeSessionForTokensCommand): Promise<ExchangeSessionForTokensResult> {
    const payload = await this.sessionExchange.consume(command.sessionExchangeId);
    if (!payload) {
      this.logger.warn('Session exchange invalid or expired', 'ExchangeSessionForTokensUseCase');
      throw new SessionExchangeInvalidException();
    }

    const tokenPair = await this.tokenGenerator.generateTokenPair({
      userId: payload.userId,
      email: payload.email,
    });

    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + REFRESH_TOKEN_DAYS);

    // Tag the refresh token row with TOKEN_EXCHANGE so the sessions
    // settings page can attribute it correctly.
    await this.repository.createRefreshToken(
      payload.userId,
      tokenPair.refreshToken,
      refreshTokenExpiry,
      'TOKEN_EXCHANGE',
    );

    return {
      userId: payload.userId,
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
    };
  }
}
