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

import { LoggerPort } from '@/shared-kernel';
import type { SessionPayload } from '../../../domain/ports';
import {
  AuthenticationRepositoryPort,
  SessionStoragePort,
  TokenGeneratorPort,
} from '../../../domain/ports';
import type {
  SessionUserData,
  ValidateSessionCommand,
  ValidateSessionPort,
  ValidateSessionResult,
} from '../../ports';

export class ValidateSessionUseCase implements ValidateSessionPort {
  constructor(
    private readonly repository: AuthenticationRepositoryPort,
    private readonly tokenGenerator: TokenGeneratorPort,
    private readonly sessionStorage: SessionStoragePort,
    private readonly logger: LoggerPort,
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
    } catch (err) {
      // Token is malformed/expired/tampered. Don't surface the reason to the
      // client (info leak about JWT secret state), but emit telemetry so a
      // spike of failures is visible — investigation of "users keep getting
      // logged out" starts here.
      this.logger.debug(
        `Session token verification failed: ${err instanceof Error ? err.message : 'unknown'}`,
        'ValidateSessionUseCase',
      );
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
    const role = (userData.role ?? 'USER') as 'USER' | 'ADMIN';
    const roles = userData.roles ?? ['role_user'];
    // E2E/dev hatch: when SKIP_EMAIL_VERIFICATION is enabled, the HTTP guard
    // bypasses enforcement — keep the session payload consistent so the
    // frontend's OnboardingGuard doesn't redirect to /identity/verify-email
    // based on a flag the backend is ignoring.
    const skipEmailVerification = process.env.SKIP_EMAIL_VERIFICATION === 'true';
    // Onboarding is a job-seeker invariant — admins and recruiters bypass it
    // entirely. The `role_user_standard` marker is only assigned to accounts
    // that represent real candidates. Without it we never block on onboarding.
    const isStandardUser = roles.includes('role_user_standard');
    const sessionUserData: SessionUserData = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      username: userData.username,
      hasCompletedOnboarding: userData.hasCompletedOnboarding,
      emailVerified: skipEmailVerification ? true : userData.emailVerified,
      role,
      roles,
      // Calculated fields - frontend should NOT calculate these
      isAdmin: role === 'ADMIN',
      needsOnboarding: isStandardUser && !userData.hasCompletedOnboarding,
      needsEmailVerification: skipEmailVerification ? false : !userData.emailVerified,
    };

    return {
      success: true,
      user: sessionUserData,
    };
  }
}
