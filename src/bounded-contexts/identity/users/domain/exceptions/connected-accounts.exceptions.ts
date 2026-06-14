import { DomainException } from '@/shared-kernel/exceptions';

/**
 * Thrown when disconnecting an OAuth provider would leave the account with no
 * way to sign in (no password set and this was the only linked provider).
 */
export class CannotRemoveLastLoginMethodException extends DomainException {
  readonly code = 'CANNOT_REMOVE_LAST_LOGIN_METHOD';
  readonly statusHint = 409;

  constructor() {
    super('Cannot disconnect the only login method; set a password first');
  }
}

/**
 * Thrown when the user has no linked account for the requested provider.
 */
export class ConnectedAccountNotFoundException extends DomainException {
  readonly code = 'CONNECTED_ACCOUNT_NOT_FOUND';
  readonly statusHint = 404;

  constructor() {
    super('No connected account found for this provider');
  }
}
