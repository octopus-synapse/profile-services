/**
 * Validate Session Use Case
 *
 * Validates an existing session from cookie.
 * Returns user data if session is valid, null otherwise.
 *
 * Used by:
 * - JwtStrategy to authenticate requests
 * - Session endpoint to return current user
 */

import { Inject, Injectable } from '@nestjs/common';
import type {
  SessionUserData,
  ValidateSessionCommand,
  ValidateSessionPort,
  ValidateSessionResult,
} from '../../ports/inbound';
import type {
  AuthenticationRepositoryPort,
  SessionPayload,
  SessionStoragePort,
  TokenGeneratorPort,
} from '../../ports/outbound';

// Injection tokens
const AUTH_REPOSITORY = Symbol('AuthenticationRepositoryPort');
const TOKEN_GENERATOR = Symbol('TokenGeneratorPort');
const SESSION_STORAGE = Symbol('SessionStoragePort');

@Injectable()
export class ValidateSessionUseCase implements ValidateSessionPort {
  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly repository: AuthenticationRepositoryPort,
    @Inject(TOKEN_GENERATOR)
    private readonly tokenGenerator: TokenGeneratorPort,
    @Inject(SESSION_STORAGE)
    private readonly sessionStorage: SessionStoragePort,
  ) {}

  async execute(command: ValidateSessionCommand): Promise<ValidateSessionResult> {
    const { cookieReader } = command;

    // 1. Extract session token from cookie
    const sessionToken = this.sessionStorage.getSessionCookie(cookieReader);
    if (!sessionToken) {
      return { success: false, user: null };
    }

    // 2. Verify and decode JWT
    let payload: SessionPayload;
    try {
      const decoded = await this.tokenGenerator.verifySessionToken(sessionToken);
      if (!decoded) {
        return { success: false, user: null };
      }
      payload = decoded;
    } catch {
      return { success: false, user: null };
    }

    // 3. Check expiration (exp is in seconds, Date.now() is in milliseconds)
    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (nowInSeconds > payload.exp) {
      return { success: false, user: null };
    }

    // 4. Fetch fresh user data
    const userData = await this.repository.findSessionUser(payload.sub);
    if (!userData) {
      return { success: false, user: null };
    }

    // 5. Return validated session data with calculated fields
    const role = userData.role ?? 'USER';
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
      isApprover: role === 'APPROVER',
      needsOnboarding: !userData.hasCompletedOnboarding,
      needsEmailVerification: !userData.emailVerified,
    };

    return {
      success: true,
      user: sessionUserData,
    };
  }
}

export { AUTH_REPOSITORY, TOKEN_GENERATOR, SESSION_STORAGE };
