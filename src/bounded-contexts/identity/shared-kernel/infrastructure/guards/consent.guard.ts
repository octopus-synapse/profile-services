import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { GetConsentStatusUseCasePort } from '@/bounded-contexts/identity/account-lifecycle/application/use-cases/tokens';
// Import from a leaf token file (NOT a controller, NOT a use-case) to avoid
// any circular dependency: the account-lifecycle controllers and use-cases
// transitively import from this same shared-kernel infrastructure barrel.
import { ConsentRequiredException } from '@/bounded-contexts/identity/account-lifecycle/domain/exceptions';

import { ALLOW_UNVERIFIED_EMAIL_KEY } from '../decorators/allow-unverified-email.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SKIP_TOS_CHECK_KEY } from '../decorators/skip-tos-check.decorator';

/**
 * ConsentGuard
 *
 * Enforces that the authenticated user has accepted both Terms of Service and
 * Privacy Policy at the current versions. LGPD art. 7: tratamento só é lícito
 * com consentimento do titular (ou outra base legal declarada).
 *
 * Runs AFTER JwtAuthGuard. Skipped for:
 * - @Public() routes (no auth required)
 * - @SkipTosCheck() routes (consent endpoints, account deletion, export)
 * - @AllowUnverifiedEmail() routes (still-onboarding flows)
 */
@Injectable()
export class ConsentGuard implements CanActivate {
  /**
   * When SKIP_TOS_CHECK=true the guard short-circuits to allow.
   * Mirrors EmailVerifiedGuard's SKIP_EMAIL_VERIFICATION escape hatch and
   * the env var that's already wired through docker-compose.dev.yml; lets
   * existing dev users (seeded before the consent gate landed) keep working
   * without first having to backfill UserConsent rows.
   */
  private readonly skipTosCheck: boolean;

  constructor(
    private readonly reflector: Reflector,
    config: ConfigService,
    private readonly getConsentStatus: GetConsentStatusUseCasePort,
  ) {
    this.skipTosCheck = config.get<string>('SKIP_TOS_CHECK') === 'true';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.skipTosCheck) return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const skipTos = this.reflector.getAllAndOverride<boolean>(SKIP_TOS_CHECK_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipTos) return true;

    const allowUnverified = this.reflector.getAllAndOverride<boolean>(ALLOW_UNVERIFIED_EMAIL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowUnverified) return true;

    const request = context.switchToHttp().getRequest<{ user?: { userId?: string } }>();
    const user = request.user;
    if (!user?.userId) {
      // No authenticated user — JwtAuthGuard already rejected or this is public.
      return true;
    }

    const status = await this.getConsentStatus.execute({ userId: user.userId });
    if (!status.tosAccepted || !status.privacyPolicyAccepted) {
      throw new ConsentRequiredException();
    }
    return true;
  }
}
