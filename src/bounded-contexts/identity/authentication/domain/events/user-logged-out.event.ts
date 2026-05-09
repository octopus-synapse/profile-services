/**
 * Authentication Domain Events
 */
import { DomainEvent } from '../../../shared-kernel/domain/events';

/**
 * User Logged Out Event
 *
 * Fired when a user logs out.
 */
export class UserLoggedOutEvent extends DomainEvent {
  readonly eventType = 'auth.user.logged_out';
  readonly aggregateId: string;

  get payload(): Record<string, unknown> {
    return this.getPayload();
  }

  constructor(
    public readonly userId: string,
    public readonly logoutType: 'manual' | 'token_expired' | 'all_sessions',
  ) {
    super();
    this.aggregateId = userId;
  }

  protected getPayload(): Record<string, unknown> {
    return { userId: this.userId, logoutType: this.logoutType };
  }
}
