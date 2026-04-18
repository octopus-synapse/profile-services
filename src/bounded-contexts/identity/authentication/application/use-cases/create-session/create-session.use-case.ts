/**
 * Create Session Use Case
 *
 * Creates a new authenticated session after successful login.
 * Sets httpOnly cookie with JWT session token and returns user data.
 *
 * This use case bridges the gap between login (validates credentials)
 * and session establishment (sets secure cookie).
 */

import { Inject, Injectable } from '@nestjs/common';

/** Narrow view of ConfigService used by this use case (DIP). */
export interface SessionConfigPort {
  get<T>(key: string, defaultValue: T): T;
}

import type { EventBusPort } from '../../../../shared-kernel/ports';
import { Session, SessionCreatedEvent } from '../../../domain';
import type {
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

// Injection tokens
const AUTH_REPOSITORY = Symbol('AuthenticationRepositoryPort');
const TOKEN_GENERATOR = Symbol('TokenGeneratorPort');
const SESSION_STORAGE = Symbol('SessionStoragePort');
const EVENT_BUS = Symbol('EventBusPort');

@Injectable()
export class CreateSessionUseCase implements CreateSessionPort {
  private readonly sessionExpiryDays: number;

  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly repository: AuthenticationRepositoryPort,
    @Inject(TOKEN_GENERATOR)
    private readonly tokenGenerator: TokenGeneratorPort,
    @Inject(SESSION_STORAGE)
    private readonly sessionStorage: SessionStoragePort,
    @Inject(EVENT_BUS)
    private readonly eventBus: EventBusPort,
    private readonly configService: SessionConfigPort,
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

    // 4. Fetch user data for response
    const userData = await this.repository.findSessionUser(userId);
    if (!userData) {
      throw new Error('User not found after session creation');
    }

    // 5. Publish event
    this.eventBus.publish(new SessionCreatedEvent(session.id, userId, ipAddress, userAgent));

    // 6. Return user data with calculated fields
    const role = (userData.role ?? 'USER') as 'USER' | 'ADMIN';
    const roles = userData.roles ?? ['role_user'];
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
      isAdmin: role === 'ADMIN',
      needsOnboarding: !userData.hasCompletedOnboarding,
      needsEmailVerification: !userData.emailVerified,
    };

    return {
      success: true,
      user: sessionUserData,
    };
  }
}

export { AUTH_REPOSITORY, EVENT_BUS, SESSION_STORAGE, TOKEN_GENERATOR };
