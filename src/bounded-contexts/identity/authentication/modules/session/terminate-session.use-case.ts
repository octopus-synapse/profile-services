/**
 * Terminate Session Use Case
 *
 * Terminates an active session by clearing the cookie.
 * Used during logout or manual session revocation.
 */

import { Inject, Injectable } from '@nestjs/common';
import type { EventBusPort } from '../../../shared-kernel/ports';
import { SessionTerminatedEvent } from '../../domain';
import type {
  TerminateSessionCommand,
  TerminateSessionPort,
  TerminateSessionResult,
} from '../../ports/inbound';
import type { SessionPayload, SessionStoragePort, TokenGeneratorPort } from '../../ports/outbound';

// Injection tokens
const TOKEN_GENERATOR = Symbol('TokenGeneratorPort');
const SESSION_STORAGE = Symbol('SessionStoragePort');
const EVENT_BUS = Symbol('EventBusPort');

@Injectable()
export class TerminateSessionUseCase implements TerminateSessionPort {
  constructor(
    @Inject(TOKEN_GENERATOR)
    private readonly tokenGenerator: TokenGeneratorPort,
    @Inject(SESSION_STORAGE)
    private readonly sessionStorage: SessionStoragePort,
    @Inject(EVENT_BUS)
    private readonly eventBus: EventBusPort,
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

export { TOKEN_GENERATOR, SESSION_STORAGE, EVENT_BUS };
