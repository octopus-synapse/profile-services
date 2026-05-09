/**
 * Authentication Domain Events
 */
import { DomainEvent } from '../../../shared-kernel/domain/events';

/**
 * Login Failed Event
 *
 * Fired when a login attempt fails.
 */
export class LoginFailedEvent extends DomainEvent {
  readonly eventType = 'auth.login.failed';
  readonly aggregateId: string;

  get payload(): Record<string, unknown> {
    return this.getPayload();
  }

  constructor(
    public readonly email: string,
    public readonly reason:
      | 'invalid_credentials'
      | 'account_locked'
      | 'account_inactive'
      | 'invalid_2fa',
    public readonly ipAddress?: string,
  ) {
    super();
    this.aggregateId = email;
  }

  protected getPayload(): Record<string, unknown> {
    return { email: this.email, reason: this.reason, ipAddress: this.ipAddress };
  }
}
