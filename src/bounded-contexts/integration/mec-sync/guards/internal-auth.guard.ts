/**
 * Internal Auth Guard
 * Protects internal endpoints with a secret token
 * Used for GitHub Actions and other internal services
 */

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ERROR_MESSAGES } from '@/shared-kernel';

const INTERNAL_TOKEN_HEADER = 'x-internal-token';

@Injectable()
export class InternalAuthGuard implements CanActivate {
  private readonly internalToken: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.internalToken = this.configService.get<string>('INTERNAL_API_TOKEN');
  }

  canActivate(context: ExecutionContext): boolean {
    // If no token is configured, deny all access (security by default)
    if (!this.internalToken) {
      throw new UnauthorizedException(
        'Internal API token not configured. Set INTERNAL_API_TOKEN environment variable.',
      );
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const providedToken = request.headers[INTERNAL_TOKEN_HEADER] as string | undefined;

    if (!providedToken) {
      throw new UnauthorizedException(`Missing ${INTERNAL_TOKEN_HEADER} header`);
    }

    // Use timing-safe comparison to prevent timing attacks
    if (!this.timingSafeEqual(providedToken, this.internalToken)) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_INTERNAL_TOKEN);
    }

    return true;
  }

  /**
   * Timing-safe string comparison
   */
  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}
