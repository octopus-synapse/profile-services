/**
 * Password Management Domain Events
 */
import { DomainEvent } from '../../../shared-kernel/domain/events';

/**
 * Password Reset Requested Event
 *
 * Fired when a user requests a password reset.
 */
export class PasswordResetRequestedEvent extends DomainEvent {
  readonly eventType = 'password.reset.requested';
  readonly aggregateId: string;

  get payload(): Record<string, unknown> {
    return this.getPayload();
  }

  constructor(
    public readonly userId: string,
    public readonly email: string,
  ) {
    super();
    this.aggregateId = userId;
  }

  protected getPayload(): Record<string, unknown> {
    return {
      userId: this.userId,
      email: this.email,
    };
  }
}

/**
 * Password Changed Event
 *
 * Fired when a user changes their password (via profile or reset).
 */
export class PasswordChangedEvent extends DomainEvent {
  readonly eventType = 'password.changed';
  readonly aggregateId: string;

  get payload(): Record<string, unknown> {
    return this.getPayload();
  }

  constructor(
    public readonly userId: string,
    public readonly changedVia: 'reset' | 'profile',
  ) {
    super();
    this.aggregateId = userId;
  }

  protected getPayload(): Record<string, unknown> {
    return {
      userId: this.userId,
      changedVia: this.changedVia,
    };
  }
}
