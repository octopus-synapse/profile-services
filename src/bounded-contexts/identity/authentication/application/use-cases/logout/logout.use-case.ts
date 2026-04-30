import { LoggerPort } from '@/shared-kernel';
import { EventBusPort } from '../../../../shared-kernel/ports/event-bus.port';
import { UserLoggedOutEvent } from '../../../domain/events';
import { AuthenticationRepositoryPort } from '../../../domain/ports';
import type { LogoutCommand, LogoutPort, LogoutResult } from '../../ports';

export class LogoutUseCase implements LogoutPort {
  constructor(
    private readonly repository: AuthenticationRepositoryPort,
    private readonly eventBus: EventBusPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(command: LogoutCommand): Promise<LogoutResult> {
    const { userId, refreshToken, logoutAllSessions } = command;

    if (logoutAllSessions) {
      await this.repository.deleteAllUserRefreshTokens(userId);
      this.eventBus.publish(new UserLoggedOutEvent(userId, 'all_sessions'));
    } else if (refreshToken) {
      await this.repository.deleteRefreshToken(refreshToken);
      this.eventBus.publish(new UserLoggedOutEvent(userId, 'manual'));
    }

    return { success: true };
  }
}
