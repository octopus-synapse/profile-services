import { DomainException } from '@/shared-kernel/exceptions';

/**
 * Disable-2FA requires the user to re-prove credential ownership (current
 * password OR a valid TOTP). Thrown when neither was supplied.
 */
export class TwoFactorReauthRequiredException extends DomainException {
  readonly code = 'TWO_FACTOR_REAUTH_REQUIRED';
  readonly statusHint = 400;

  constructor() {
    super('Disabling 2FA requires the current password or a valid TOTP code');
  }
}
