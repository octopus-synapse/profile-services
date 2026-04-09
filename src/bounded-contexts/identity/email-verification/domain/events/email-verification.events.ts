/**
 * Email Verification Domain Events
 */
import { DomainEvent } from '../../../shared-kernel/domain/events';

/**
 * Verification Email Sent Event
 *
 * Fired when a verification email is sent to a user.
 */
export class VerificationEmailSentEvent extends DomainEvent {
  readonly eventType = 'email.verification.sent';
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
 * Email Verified Event
 *
 * Fired when a user successfully verifies their email.
 */
export class EmailVerifiedEvent extends DomainEvent {
  readonly eventType = 'email.verified';
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
