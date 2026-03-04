/**
 * User Deleted Domain Event
 *
 * Emitted when a user account is deleted from the identity context.
 * Other bounded contexts can subscribe to this event to clean up
 * their own user-related data.
 */

import { DomainEvent } from './domain-event.base';

export interface UserDeletedPayload {
  reason: string;
}

export class UserDeletedEvent extends DomainEvent {
  static readonly TYPE = 'identity.user.deleted';

  readonly eventType = UserDeletedEvent.TYPE;
  readonly aggregateId: string;
  readonly payload: UserDeletedPayload;

  constructor(userId: string, payload: UserDeletedPayload) {
    super();
    this.aggregateId = userId;
    this.payload = payload;
  }

  protected getPayload(): Record<string, unknown> {
    return {
      reason: this.payload.reason,
    };
  }
}
