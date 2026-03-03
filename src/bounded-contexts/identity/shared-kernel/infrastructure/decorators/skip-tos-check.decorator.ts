import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to skip Terms of Service check for specific endpoints.
 *
 * Use this for endpoints that need authentication but should be
 * accessible before ToS acceptance (e.g., consent status endpoint).
 */
export const SKIP_TOS_CHECK_KEY = 'skipTosCheck';
export const SkipTosCheck = () => SetMetadata(SKIP_TOS_CHECK_KEY, true);
