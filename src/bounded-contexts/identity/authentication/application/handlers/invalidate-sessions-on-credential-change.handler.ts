/**
 * Invalidate Sessions on Credential Change Handler
 *
 * Listens for credential change events and invalidates all user sessions.
 * This ensures that compromised sessions are invalidated when credentials are reset.
 */

import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import { LoggerPort } from '@/shared-kernel';
import { PasswordChangedEvent } from '../../../password-management/domain/events';
import { AuthenticationRepositoryPort } from '../../domain/ports';

// Token invalidation TTL: 24 hours (refresh tokens typically last this long)
const TOKEN_INVALIDATION_TTL_SECONDS = 24 * 60 * 60;

export class InvalidateSessionsOnCredentialChangeHandler {
  constructor(
    private readonly authRepository: AuthenticationRepositoryPort,
    private readonly cacheService: CacheService,
    private readonly logger: LoggerPort,
  ) {}

  async handleSessionInvalidate(event: { userId: string }): Promise<void> {
    await this.authRepository.invalidateSessionCache(event.userId);
  }

  /**
   * Refresh the cached session snapshot as soon as a user verifies their
   * email. Without this the `validate-session` cache keeps serving
   * `emailVerified: false` for up to 10 minutes, and the `/identity/verify-email`
   * screen doesn't redirect even after verification succeeds.
   */
  async handleEmailVerified(event: { userId: string }): Promise<void> {
    await this.authRepository.invalidateSessionCache(event.userId);
  }

  async handle(event: PasswordChangedEvent): Promise<void> {
    const { userId, changedVia } = event;

    this.logger.log(
      `Invalidating sessions for user ${userId} after credential ${changedVia}`,
      InvalidateSessionsOnCredentialChangeHandler.name,
    );

    try {
      // Delete all refresh tokens for the user
      await this.authRepository.deleteAllUserRefreshTokens(userId);

      // Invalidate session cache
      await this.authRepository.invalidateSessionCache(userId);

      // Set token invalidation timestamp - any JWT issued before this time is invalid
      const now = Math.floor(Date.now() / 1000);
      // Inlined from the deleted Nest `JwtStrategy.getTokenValidAfterKey(userId)`.
      // The auth-extractor pipeline stage compares each JWT's `iat` against
      // this timestamp and rejects tokens issued before it.
      await this.cacheService.set(
        `auth:token-valid-after:${userId}`,
        now,
        TOKEN_INVALIDATION_TTL_SECONDS,
      );

      this.logger.log(
        `Successfully invalidated all sessions for user ${userId}`,
        InvalidateSessionsOnCredentialChangeHandler.name,
      );
    } catch (error) {
      this.logger.error(`Failed to invalidate sessions for user ${userId}`, { context: InvalidateSessionsOnCredentialChangeHandler.name, stack: error instanceof Error ? error.stack : String(error) });
    }
  }
}
