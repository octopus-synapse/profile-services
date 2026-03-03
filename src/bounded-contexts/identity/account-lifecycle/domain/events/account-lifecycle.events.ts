/**
 * Account Lifecycle Domain Events
 */
import { DomainEvent } from '../../../shared-kernel/domain/events';

/**
 * Account Created Event
 *
 * Fired when a new account is created.
 */
export class AccountCreatedEvent extends DomainEvent {
  readonly eventType = 'account.created';
  readonly aggregateId: string;

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
 * Account Deactivated Event
 *
 * Fired when an account is deactivated.
 */
export class AccountDeactivatedEvent extends DomainEvent {
  readonly eventType = 'account.deactivated';
  readonly aggregateId: string;

  constructor(
    public readonly userId: string,
    public readonly reason?: string,
  ) {
    super();
    this.aggregateId = userId;
  }

  protected getPayload(): Record<string, unknown> {
    return {
      userId: this.userId,
      reason: this.reason,
    };
  }
}

/**
 * Account Reactivated Event
 *
 * Fired when an account is reactivated.
 */
export class AccountReactivatedEvent extends DomainEvent {
  readonly eventType = 'account.reactivated';
  readonly aggregateId: string;

  constructor(public readonly userId: string) {
    super();
    this.aggregateId = userId;
  }

  protected getPayload(): Record<string, unknown> {
    return {
      userId: this.userId,
    };
  }
}

/**
 * Account Deleted Event
 *
 * Fired when an account is permanently deleted.
 */
export class AccountDeletedEvent extends DomainEvent {
  readonly eventType = 'account.deleted';
  readonly aggregateId: string;

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
