/**
 * Role Assigned Event
 *
 * Emitted when a role is assigned to a user.
 * Listeners can update caches, send notifications, or audit log.
 */

import { DomainEvent } from '@/shared-kernel';

export interface RoleAssignedPayload {
  readonly roleId: string;
  readonly assignedBy: string;
  readonly expiresAt?: Date;
}

export class RoleAssignedEvent extends DomainEvent<RoleAssignedPayload> {
  static readonly TYPE = 'identity.authorization.role.assigned';

  constructor(userId: string, payload: RoleAssignedPayload) {
    super(RoleAssignedEvent.TYPE, userId, payload);
  }
}
