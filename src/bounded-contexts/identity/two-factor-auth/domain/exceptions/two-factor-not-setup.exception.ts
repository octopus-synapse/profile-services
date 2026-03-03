import { DomainException } from '@/bounded-contexts/identity/shared-kernel/exceptions';

export class TwoFactorNotSetupException extends DomainException {
  readonly code = 'TWO_FACTOR_NOT_SETUP';

  constructor() {
    super('Two-factor authentication setup not found');
  }
}
