import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TosAcceptanceService } from '../services/tos-acceptance.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Guard that enforces Terms of Service acceptance
 * Blocks API access for authenticated users who haven't accepted current ToS version
 * 
 * @example
 * // Applied globally in AuthModule
 * APP_GUARD provider with TosGuard
 * 
 * // Skip for specific routes
 * @Public()
 * @Get('health')
 * healthCheck() { ... }
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

    // Get user from request (set by JWT auth guard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If no user, let auth guard handle it
    if (!user || !user.id) {
      return true;
    }

    // Check if user has accepted current ToS version
    const hasAccepted = await this.tosService.hasAcceptedCurrentVersion(
      user.id,
    );

    if (!hasAccepted) {
      throw new ForbiddenException(
        'You must accept the Terms of Service to use this application. ' +
          'Please visit /api/v1/users/me/accept-terms to continue.',
      );
    }

    return true;
  }
}
