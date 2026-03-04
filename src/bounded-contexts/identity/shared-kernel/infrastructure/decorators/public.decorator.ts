import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to mark endpoints as public (no authentication required).
 *
 * When applied, JwtAuthGuard will skip authentication for the endpoint.
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
