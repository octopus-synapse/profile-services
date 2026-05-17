import { DomainException } from '@/shared-kernel/exceptions';

/**
 * The credential supplied for disable-2FA re-authentication didn't match —
 * password wrong OR TOTP invalid/expired. Generic message intentionally
 * (don't leak which field failed).
 */
export class TwoFactorInvalidReauthException extends DomainException {
  readonly code = 'TWO_FACTOR_INVALID_REAUTH';
  readonly statusHint = 401;

  constructor() {
    super('Invalid credentials for disabling 2FA');
  }
}
