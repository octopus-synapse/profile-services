import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SKIP_TOS_CHECK_KEY } from '../decorators/skip-tos-check.decorator';
import { TosAcceptanceService } from '../services/tos-acceptance.service';

/**
 * Guard that enforces Terms of Service acceptance
 * Blocks API access for authenticated users who haven't accepted current ToS version
 *
 * @example
 * // Applied globally in AuthModule
 * APP_GUARD provider with TosGuard
 *
 * // Skip for specific routes (also skips auth)
 * @Public()
 * @Get('health')
 * healthCheck() { ... }
 *
 * // Skip ToS check but keep auth requirement
 * @SkipTosCheck()
 * @Get('consent-status')
 * getConsentStatus() { ... }
 */
@Injectable()
export class TosGuard implements CanActivate {
  constructor(
    private readonly tosService: TosAcceptanceService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Check if route explicitly skips ToS check (but still requires auth)
    const skipTosCheck = this.reflector.getAllAndOverride<boolean>(SKIP_TOS_CHECK_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipTosCheck) {
      return true;
    }

    // Get user from request (set by JWT auth guard)
    const request = context.switchToHttp().getRequest<{ user?: { userId: string } }>();
    const user = request.user;

    // If no user, let auth guard handle it
    if (!user?.userId) {
      return true;
    }

    // Check if user has accepted current versions of required documents
    const userId = user.userId;
    const [hasAcceptedTos, hasAcceptedPrivacy] = await Promise.all([
      this.tosService.hasAcceptedCurrentVersion(userId, 'TERMS_OF_SERVICE'),
      this.tosService.hasAcceptedCurrentVersion(userId, 'PRIVACY_POLICY'),
    ]);

    if (!hasAcceptedTos || !hasAcceptedPrivacy) {
      const missing: string[] = []; // ← TIPO EXPLÍCITO AQUI
      if (!hasAcceptedTos) missing.push('Terms of Service');
      if (!hasAcceptedPrivacy) missing.push('Privacy Policy');

      throw new ForbiddenException(
        `You must accept the ${missing.join(' and ')} to use this application. ` +
          'Please visit /api/v1/users/me/accept-consent to continue.',
      );
    }

    return true;
  }
}
