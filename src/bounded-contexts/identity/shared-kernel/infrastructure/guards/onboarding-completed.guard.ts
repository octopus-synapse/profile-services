import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OnboardingStepNotCompletedException } from '@/bounded-contexts/onboarding/domain/exceptions/onboarding.exceptions';
import { ALLOW_INCOMPLETE_ONBOARDING_KEY } from '../decorators/allow-incomplete-onboarding.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Blocks protected routes for authenticated users who haven't finished
 * onboarding (`hasCompletedOnboarding === false`). Runs AFTER
 * `EmailVerifiedGuard` in the chain — email-verify must clear first so
 * the error code the frontend sees is the most specific stage.
 *
 * Opt-out decorators:
 *  - `@Public()` — no auth required, nothing to gate
 *  - `@AllowIncompleteOnboarding()` — route is part of the onboarding
 *    flow itself (session, verify-email, onboarding endpoints, logout,
 *    legal pages)
 *
 * Admins bypass entirely since the frontend's OnboardingGuard also
 * exempts them — keeping both sides consistent avoids lockouts.
 */
@Injectable()
export class OnboardingCompletedGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const allowIncomplete = this.reflector.getAllAndOverride<boolean>(
      ALLOW_INCOMPLETE_ONBOARDING_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (allowIncomplete) return true;

    const request = context.switchToHttp().getRequest<{
      user?: { hasCompletedOnboarding?: boolean; roles?: string[] };
    }>();
    const user = request.user;

    // No user means JwtAuthGuard didn't run or failed — let auth handle it.
    if (!user) return true;

    // Onboarding is a candidate-only invariant. Only accounts tagged
    // `role_user_standard` are required to go through the wizard; admins,
    // recruiters, and other role variants skip it entirely. This mirrors
    // the `isStandardUser` gate in ValidateSessionUseCase so the backend
    // and the frontend's OnboardingGuard agree on who's locked out.
    const isStandardUser = user.roles?.includes('role_user_standard') ?? false;
    if (!isStandardUser) return true;

    if (!user.hasCompletedOnboarding) {
      throw new OnboardingStepNotCompletedException('any');
    }

    return true;
  }
}
