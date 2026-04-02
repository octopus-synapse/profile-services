/**
 * Invalidate Sessions on Credential Change Handler
 *
 * Listens for credential change events and invalidates all user sessions.
 * This ensures that compromised sessions are invalidated when credentials are reset.
 */

import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { PasswordChangedEvent } from '../../../password-management/domain/events';
import { JwtStrategy } from '../../../shared-kernel/infrastructure/strategies';
import type { AuthenticationRepositoryPort } from '../../domain/ports';
import { AUTHENTICATION_REPOSITORY_PORT } from '../../domain/ports';

// Token invalidation TTL: 24 hours (refresh tokens typically last this long)
const TOKEN_INVALIDATION_TTL_SECONDS = 24 * 60 * 60;

@Injectable()
export class InvalidateSessionsOnCredentialChangeHandler {
  constructor(
    @Inject(AUTHENTICATION_REPOSITORY_PORT)
    private readonly authRepository: AuthenticationRepositoryPort,
    private readonly cacheService: CacheService,
    private readonly logger: AppLoggerService,
  ) {}

  @OnEvent('password.changed')
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
      await this.cacheService.set(
        JwtStrategy.getTokenValidAfterKey(userId),
        now,
        TOKEN_INVALIDATION_TTL_SECONDS,
      );

      this.logger.log(
        `Successfully invalidated all sessions for user ${userId}`,
        InvalidateSessionsOnCredentialChangeHandler.name,
      );
    } catch (error) {
      this.logger.error(
        `Failed to invalidate sessions for user ${userId}`,
        error instanceof Error ? error.stack : String(error),
        InvalidateSessionsOnCredentialChangeHandler.name,
      );
    }
  }
}
