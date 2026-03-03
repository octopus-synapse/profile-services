import { DomainException } from '@/bounded-contexts/identity/shared-kernel/exceptions';

export class InvalidTotpTokenException extends DomainException {
  readonly code = 'INVALID_TOTP_TOKEN';

  constructor() {
    super('Invalid two-factor authentication token');
  }
}
