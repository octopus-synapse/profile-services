/**
 * Group Membership Changed Event
 *
 * Emitted when a user is added to or removed from a group.
 */

import { DomainEvent } from '@/shared-kernel';

export interface GroupMembershipChangedPayload {
  readonly groupId: string;
  readonly action: 'added' | 'removed';
}

export class GroupMembershipChangedEvent extends DomainEvent<GroupMembershipChangedPayload> {
  static readonly TYPE = 'identity.authorization.group.membership.changed';

  constructor(userId: string, payload: GroupMembershipChangedPayload) {
    super(GroupMembershipChangedEvent.TYPE, userId, payload);
  }
}
