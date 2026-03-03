/**
 * User Registered Domain Event
 *
 * Emitted when a new user successfully registers in the identity context.
 * Other bounded contexts can subscribe to this event to initialize
 * their own user-related data.
 */

import { DomainEvent } from './domain-event.base';

export interface UserRegisteredPayload {
  email: string;
  username: string;
}

export class UserRegisteredEvent extends DomainEvent {
  static readonly TYPE = 'identity.user.registered';

  readonly eventType = UserRegisteredEvent.TYPE;
  readonly aggregateId: string;
  readonly payload: UserRegisteredPayload;

  constructor(userId: string, payload: UserRegisteredPayload) {
    super();
    this.aggregateId = userId;
    this.payload = payload;
  }

  protected getPayload(): Record<string, unknown> {
    return {
      email: this.payload.email,
      username: this.payload.username,
    };
  }
}
