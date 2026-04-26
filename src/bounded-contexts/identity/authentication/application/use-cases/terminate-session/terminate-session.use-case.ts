/**
 * Terminate Session Use Case
 *
 * Terminates an active session by clearing the cookie.
 * Used during logout or manual session revocation.
 */

import { LoggerPort } from '@/shared-kernel';
import { EventBusPort } from '../../../../shared-kernel/ports/event-bus.port';
import { SessionTerminatedEvent } from '../../../domain';
import type { SessionPayload } from '../../../domain/ports';
import { SessionStoragePort, TokenGeneratorPort } from '../../../domain/ports';
import type {
  TerminateSessionCommand,
  TerminateSessionPort,
  TerminateSessionResult,
} from '../../ports';

export class TerminateSessionUseCase implements TerminateSessionPort {
  constructor(
    private readonly tokenGenerator: TokenGeneratorPort,
    private readonly sessionStorage: SessionStoragePort,
    private readonly eventBus: EventBusPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(command: TerminateSessionCommand): Promise<TerminateSessionResult> {
    const { cookieReader, cookieWriter, terminateAllSessions } = command;

    // 1. Extract session info before clearing (for audit)
    const sessionToken = this.sessionStorage.getSessionCookie(cookieReader);
    let sessionId: string | undefined;
    let userId: string | undefined;

    if (sessionToken) {
      try {
        const payload: SessionPayload | null =
          await this.tokenGenerator.verifySessionToken(sessionToken);
        if (payload) {
          sessionId = payload.sessionId;
          userId = payload.sub;
        }
      } catch {
        // Token invalid, still clear cookie
      }
    }

    // 2. Clear session cookie
    this.sessionStorage.clearSessionCookie(cookieWriter);

    // 3. Publish termination event
    if (sessionId && userId) {
      const reason = terminateAllSessions ? 'revoked' : 'logout';
      this.eventBus.publish(new SessionTerminatedEvent(sessionId, userId, reason));
    }

    return {
      success: true,
      message: 'Session terminated successfully',
    };
  }
}
