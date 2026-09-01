/**
 * `RegistrationTokenIssuerPort` over the shared-kernel HMAC helper —
 * binds the app secret once at composition time so use cases never see
 * config.
 */

import { issueRegistrationToken } from '@/shared-kernel/auth/registration-token';
import type { RegistrationTokenIssuerPort } from '../../../domain/ports';

export class SignedRegistrationTokenIssuer implements RegistrationTokenIssuerPort {
  constructor(private readonly secret: string) {}

  issue(email: string): string {
    return issueRegistrationToken(email, this.secret);
  }
}
