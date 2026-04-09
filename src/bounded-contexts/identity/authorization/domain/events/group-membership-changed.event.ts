/**
 * Group Membership Changed Event
 *
 * Emitted when a user is added to or removed from a group.
 */

import { DomainEvent } from '../../../shared-kernel/domain/events';

export interface GroupMembershipChangedPayload {
  readonly groupId: string;
  readonly action: 'added' | 'removed';
}

export class GroupMembershipChangedEvent extends DomainEvent<GroupMembershipChangedPayload> {
  static readonly TYPE = 'identity.authorization.group.membership.changed';

  readonly eventType = GroupMembershipChangedEvent.TYPE;
  readonly aggregateId: string;
  readonly payload: GroupMembershipChangedPayload;

  constructor(userId: string, payload: GroupMembershipChangedPayload) {
    super();
    this.aggregateId = userId;
    this.payload = payload;
  }

  protected getPayload(): Record<string, unknown> {
    return { ...this.payload };
  }
}
