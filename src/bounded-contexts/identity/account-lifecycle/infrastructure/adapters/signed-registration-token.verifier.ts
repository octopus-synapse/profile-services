/**
 * `RegistrationTokenVerifierPort` over the shared-kernel HMAC helper —
 * binds the app secret once at composition time (mirror of the issuer
 * adapter in the email-verification BC).
 */

import { verifyRegistrationToken } from '@/shared-kernel/auth/registration-token';
import type { RegistrationTokenVerifierPort } from '../../domain/ports';

export class SignedRegistrationTokenVerifier implements RegistrationTokenVerifierPort {
  constructor(private readonly secret: string) {}

  verify(token: string): string | null {
    return verifyRegistrationToken(token, this.secret);
  }
}
