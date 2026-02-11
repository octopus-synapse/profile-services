import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to allow authenticated users with unverified email
 * to access specific endpoints (e.g., verify-email/request).
 *
 * Use this for endpoints that:
 * - Require authentication (user must be logged in)
 * - But should be accessible before email verification
 *
 * Example: The verify-email/request endpoint needs this because
 * users must be able to request verification emails before
 * their email is verified.
 */
export const ALLOW_UNVERIFIED_EMAIL_KEY = 'allowUnverifiedEmail';
export const AllowUnverifiedEmail = () => SetMetadata(ALLOW_UNVERIFIED_EMAIL_KEY, true);
