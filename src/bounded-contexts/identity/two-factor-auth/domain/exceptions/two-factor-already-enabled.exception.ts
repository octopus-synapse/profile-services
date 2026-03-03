import { DomainException } from '@/bounded-contexts/identity/shared-kernel/exceptions';

export class TwoFactorAlreadyEnabledException extends DomainException {
  readonly code = 'TWO_FACTOR_ALREADY_ENABLED';

  constructor() {
    super('Two-factor authentication is already enabled');
  }
}
