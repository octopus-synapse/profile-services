import { Inject, Injectable } from '@nestjs/common';
import type { EventBusPort } from '../../../../shared-kernel/ports';
import { UserLoggedOutEvent } from '../../../domain/events';
import type { AuthenticationRepositoryPort } from '../../../domain/ports';
import type { LogoutCommand, LogoutPort, LogoutResult } from '../../ports';

const AUTH_REPOSITORY = Symbol('AuthenticationRepositoryPort');
const EVENT_BUS = Symbol('EventBusPort');

@Injectable()
export class LogoutUseCase implements LogoutPort {
  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly repository: AuthenticationRepositoryPort,
    @Inject(EVENT_BUS)
    private readonly eventBus: EventBusPort,
  ) {}

  async execute(command: LogoutCommand): Promise<LogoutResult> {
    const { userId, refreshToken, logoutAllSessions } = command;

    if (logoutAllSessions) {
      // Invalidate all refresh tokens for the user
      await this.repository.deleteAllUserRefreshTokens(userId);
      this.eventBus.publish(new UserLoggedOutEvent(userId, 'all_sessions'));
    } else if (refreshToken) {
      // Invalidate specific refresh token
      await this.repository.deleteRefreshToken(refreshToken);
      this.eventBus.publish(new UserLoggedOutEvent(userId, 'manual'));
    }

    return { success: true };
  }
}

export { AUTH_REPOSITORY, EVENT_BUS };
