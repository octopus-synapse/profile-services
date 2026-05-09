/**
 * User Deleted Domain Event
 *
 * Emitted when a user account is deleted from the identity context.
 * Other bounded contexts can subscribe to this event to clean up
 * their own user-related data.
 *
 * P1-037 — handler ordering. The bus dispatches handlers in
 * registration order; today the registered subscribers are:
 *   1. `CleanupSocialOnUserDelete` (social BC) — drops follows, likes,
 *      bookmarks, posts where the user is author.
 *   2. `CleanupResumesOnUserDelete` (resumes BC) — drops resumes,
 *      sections, items, exports.
 *
 * Both handlers operate on disjoint table sets, so concurrent
 * execution against the SAME `userId` is FK-safe (the delete chains
 * don't cross). The `User` row itself is gone before the event is
 * published (the deletion use case publishes after the row is
 * removed); FK cascades from `User` are configured to either
 * cascade-delete or null-set in the schema, so the handlers find
 * already-broken references rather than trying to violate them.
 *
 * If a future handler depends on either of the existing two having
 * completed first, register it AFTER them in the bus and enable
 * `awaitHandlers: true` on the event publish call so the publishing
 * use case can fail-loud when ordering is violated.
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
    return { reason: this.payload.reason };
  }
}
