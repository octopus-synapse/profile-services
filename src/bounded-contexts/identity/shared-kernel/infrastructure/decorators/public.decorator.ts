import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiSecurity } from '@nestjs/swagger';

/**
 * Decorator to mark endpoints as public (no authentication required).
 *
 * When applied, JwtAuthGuard will skip authentication for the endpoint.
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Basic @Public() decorator - skips JWT auth
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * @PublicEndpoint() - Enhanced public decorator with Swagger docs
 *
 * Use this for endpoints that should be publicly accessible.
 * Includes Swagger documentation indicating no auth required.
 *
 * @example
 * @PublicEndpoint()
 * @Get('health')
 * health() {}
 */
export const PublicEndpoint = () =>
  applyDecorators(SetMetadata(IS_PUBLIC_KEY, true), ApiSecurity('public'));
