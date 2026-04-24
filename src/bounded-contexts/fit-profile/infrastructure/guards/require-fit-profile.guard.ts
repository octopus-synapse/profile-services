import {
  CanActivate,
  ConflictException,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { UserFitProfileRepositoryPort } from '../../domain/ports/user-fit-profile.repository.port';

interface AuthRequest extends Request {
  user?: { userId?: string; id?: string; roles?: string[] };
}

/** Plan invariant 4: only `role_user_standard` accounts must satisfy
 *  the fit-profile gate. Admins and recruiters never see the wall. */
const STANDARD_ROLE = 'role_user_standard';

/**
 * Plan invariant 5 — the Fit Profile lockout.
 *
 * Stack this guard *after* `JwtAuthGuard` (so `req.user` is populated)
 * on any endpoint that should be unavailable to standard users with
 * an absent or expired `UserFitProfile`. Returns `409 fit_profile_required`
 * to match the existing `JobMatchController` contract.
 *
 * Bypassed for non-standard users (admins, recruiters) so the gate
 * stays out of admin tooling.
 */
@Injectable()
export class RequireFitProfileGuard implements CanActivate {
  constructor(private readonly profileRepo: UserFitProfileRepositoryPort) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const userId = req.user?.userId ?? req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Authenticated user not present on request');
    }
    const roles = req.user?.roles ?? [];
    if (!roles.includes(STANDARD_ROLE)) return true;

    const profile = await this.profileRepo.findByUserId(userId);
    const isMissing = profile === null || profile.vector === null;
    const isExpired = profile !== null && profile.expiresAt.getTime() <= Date.now();
    if (isMissing || isExpired) {
      throw new ConflictException({
        code: 'fit_profile_required',
        message: 'A valid fit profile is required for this action',
        nextAction: '/v1/fit-profile/questions',
      });
    }
    return true;
  }
}
