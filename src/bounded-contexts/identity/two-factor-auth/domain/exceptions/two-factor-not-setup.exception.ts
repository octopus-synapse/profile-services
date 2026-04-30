import { DomainException } from '@/shared-kernel/exceptions';

export class TwoFactorNotSetupException extends DomainException {
  readonly code = 'TWO_FACTOR_NOT_SETUP';
  readonly statusHint = 404;

  constructor() {
    super('Two-factor authentication setup not found');
  }
}
