import { SetMetadata } from '@nestjs/common';

/**
 * Marks a route as reachable by authenticated users who haven't completed
 * onboarding yet. Use on endpoints that participate in the onboarding flow
 * itself, on session / logout / legal endpoints, and on the email-verify
 * endpoints — anything the user legitimately needs to call between
 * signup and "onboarding complete".
 */
export const ALLOW_INCOMPLETE_ONBOARDING_KEY = 'allowIncompleteOnboarding';
export const AllowIncompleteOnboarding = () => SetMetadata(ALLOW_INCOMPLETE_ONBOARDING_KEY, true);
