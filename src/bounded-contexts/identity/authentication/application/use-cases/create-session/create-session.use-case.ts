/**
 * Create Session Use Case
 *
 * Creates a new authenticated session after successful login.
 * Sets httpOnly cookie with JWT session token and returns user data.
 *
 * This use case bridges the gap between login (validates credentials)
 * and session establishment (sets secure cookie).
 */

/** Narrow view of ConfigService used by this use case (DIP). */
export interface SessionConfigPort {
  get<T>(key: string, defaultValue: T): T;
}

import { LoggerPort } from '@/shared-kernel';
import { EventBusPort } from '../../../../shared-kernel/ports/event-bus.port';
import { Session, SessionCreatedEvent } from '../../../domain';
import { SessionUserNotFoundException } from '../../../domain/exceptions/authentication.exceptions';
import {
  AuthenticationRepositoryPort,
  SessionStoragePort,
  TokenGeneratorPort,
} from '../../../domain/ports';
import type {
  CreateSessionCommand,
  CreateSessionPort,
  CreateSessionResult,
  SessionUserData,
} from '../../ports';

export class CreateSessionUseCase implements CreateSessionPort {
  private readonly sessionExpiryDays: number;

  constructor(
    private readonly repository: AuthenticationRepositoryPort,
    private readonly tokenGenerator: TokenGeneratorPort,
    private readonly sessionStorage: SessionStoragePort,
    private readonly eventBus: EventBusPort,
    private readonly configService: SessionConfigPort,
    private readonly logger: LoggerPort,
  ) {
    this.sessionExpiryDays = this.configService.get<number>('SESSION_EXPIRY_DAYS', 7);
  }

  async execute(command: CreateSessionCommand): Promise<CreateSessionResult> {
    const { userId, email, cookieWriter, ipAddress, userAgent } = command;

    // 1. Create session domain entity
    const session = Session.createNew(userId, email, this.sessionExpiryDays, ipAddress, userAgent);

    // 2. Generate session JWT
    const sessionToken = await this.tokenGenerator.generateSessionToken(session.toPayload());

    // 3. Set cookie (side effect via cookie writer abstraction)
    this.sessionStorage.setSessionCookie(cookieWriter, sessionToken, session.expiresAt);

    // 4. Fetch user data for response. Invalidate the session cache
    // first so callers that just verified email / completed onboarding
    // immediately see the fresh state on the next /auth/session call.
    await this.repository.invalidateSessionCache(userId);
    const userData = await this.repository.findSessionUser(userId);
    if (!userData) {
      throw new SessionUserNotFoundException();
    }

    // 5. Publish event
    this.eventBus.publish(new SessionCreatedEvent(session.id, userId, ipAddress, userAgent));

    // 6. Return user data with calculated fields
    const role = (userData.role ?? 'USER') as 'USER' | 'ADMIN';
    const roles = userData.roles ?? [];
    const isAdmin = role === 'ADMIN';
    const sessionUserData: SessionUserData = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      username: userData.username,
      hasCompletedOnboarding: userData.hasCompletedOnboarding,
      emailVerified: userData.emailVerified,
      role,
      roles,
      // Calculated fields - frontend should NOT calculate these
      isAdmin,
      needsOnboarding: !isAdmin && !userData.hasCompletedOnboarding,
      needsEmailVerification: !userData.emailVerified,
    };

    return {
      success: true,
      user: sessionUserData,
    };
  }
}
