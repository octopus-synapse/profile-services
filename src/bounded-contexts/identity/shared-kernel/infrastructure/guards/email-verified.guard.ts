import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOW_UNVERIFIED_EMAIL_KEY } from '../decorators/allow-unverified-email.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

const EMAIL_NOT_VERIFIED_MESSAGE = 'Email address must be verified to access this resource';

/**
 * Email Verified Guard
 *
 * Enforces email verification for protected routes.
 * Respects @AllowUnverifiedEmail() decorator.
 *
 * BUG-009 FIX: Moved email verification from JwtStrategy to this guard
 * to allow @AllowUnverifiedEmail() decorator on specific endpoints.
 *
 * This guard should run AFTER JwtAuthGuard in the guard chain.
 *
 * Can be disabled via SKIP_EMAIL_VERIFICATION=true for E2E tests.
 */
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is marked as public (no auth required)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Check if route allows unverified email
    const allowUnverified = this.reflector.getAllAndOverride<boolean>(ALLOW_UNVERIFIED_EMAIL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (allowUnverified) {
      return true;
    }

    // Get user from request (populated by JwtAuthGuard)
    const request = context.switchToHttp().getRequest<{ user?: { emailVerified?: boolean } }>();
    const user = request.user;

    if (!user) {
      // No user means JwtAuthGuard didn't run or failed - let JwtAuthGuard handle auth
      return true;
    }

    // Skip email verification in E2E test environment (user must still be authenticated)
    if (process.env.SKIP_EMAIL_VERIFICATION === 'true') {
      return true;
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new UnauthorizedException(EMAIL_NOT_VERIFIED_MESSAGE);
    }

    return true;
  }
}
