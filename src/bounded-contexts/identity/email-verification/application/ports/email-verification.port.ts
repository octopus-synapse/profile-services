/**
 * Bundle token for the email-verification BC. Doubles as the
 * TypeScript shape and the Nest DI token. The use-cases are wired
 * individually in `email-verification.module.ts` (each as its own
 * inbound port provider) and aggregated into this bundle via a
 * `useFactory` so route handlers receive a single typed dependency.
 */

import type { GetResendCooldownPort } from './get-resend-cooldown.port';
import type { SendVerificationEmailPort } from './send-verification-email.port';
import type { VerifyEmailPort } from './verify-email.port';

export abstract class EmailVerificationUseCases {
  abstract readonly sendVerificationEmail: SendVerificationEmailPort;
  abstract readonly getResendCooldown: GetResendCooldownPort;
  abstract readonly verifyEmail: VerifyEmailPort;
}
