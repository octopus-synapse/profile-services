/**
 * Bundle token for the email-verification BC. Doubles as the
 * TypeScript shape and the Nest DI token. The use-cases are wired
 * individually in `email-verification.module.ts` (each as its own
 * inbound port provider) and aggregated into this bundle via a
 * `useFactory` so route handlers receive a single typed dependency.
 */

import type { ConfirmPreSignupVerificationPort } from './confirm-pre-signup-verification.port';
import type { GetResendCooldownPort } from './get-resend-cooldown.port';
import type { SendVerificationEmailPort } from './send-verification-email.port';
import type { StartPreSignupVerificationPort } from './start-pre-signup-verification.port';
import type { VerifyEmailPort } from './verify-email.port';

export abstract class EmailVerificationUseCases {
  abstract readonly sendVerificationEmail: SendVerificationEmailPort;
  abstract readonly getResendCooldown: GetResendCooldownPort;
  abstract readonly verifyEmail: VerifyEmailPort;
  abstract readonly startPreSignupVerification: StartPreSignupVerificationPort;
  abstract readonly confirmPreSignupVerification: ConfirmPreSignupVerificationPort;
}
