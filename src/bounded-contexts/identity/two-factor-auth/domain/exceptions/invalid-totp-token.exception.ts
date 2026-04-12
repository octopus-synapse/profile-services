import { DomainException } from '@/bounded-contexts/identity/shared-kernel/exceptions';

export class InvalidTotpTokenException extends DomainException {
  readonly code = 'INVALID_TOTP_TOKEN';
  readonly statusHint = 401;

  constructor() {
    super('Invalid two-factor authentication token');
  }
}
