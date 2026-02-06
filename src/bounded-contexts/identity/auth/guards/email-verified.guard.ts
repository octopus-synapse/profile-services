import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOW_UNVERIFIED_EMAIL_KEY } from '../decorators/allow-unverified-email.decorator';
import { ERROR_MESSAGES } from '@/shared-kernel';

/**
 * Guard that enforces email verification for protected routes.
 *
 * BUG-009 FIX: Moved email verification from JwtStrategy to this guard
 * to allow @AllowUnverifiedEmail() decorator on specific endpoints.
 *
 * This guard should run AFTER JwtAuthGuard in the guard chain.
 */
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is marked as public (no auth required)
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Check if route allows unverified email
    const allowUnverified = this.reflector.getAllAndOverride<boolean>(
      ALLOW_UNVERIFIED_EMAIL_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (allowUnverified) {
      return true;
    }

    // Get user from request (populated by JwtAuthGuard)
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { emailVerified?: boolean } }>();
    const user = request.user;

    if (!user) {
      // No user means JwtAuthGuard didn't run or failed
      return true; // Let JwtAuthGuard handle this
    }

    // Enforce email verification
    if (!user.emailVerified) {
      throw new UnauthorizedException(ERROR_MESSAGES.EMAIL_NOT_VERIFIED);
    }

    return true;
  }
}
