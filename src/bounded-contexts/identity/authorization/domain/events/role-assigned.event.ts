/**
 * Role Assigned Event
 *
 * Emitted when a role is assigned to a user.
 * Listeners can update caches, send notifications, or audit log.
 */

import { DomainEvent } from '../../../shared-kernel/domain/events';

export interface RoleAssignedPayload {
  readonly roleId: string;
  readonly assignedBy: string;
  readonly expiresAt?: Date;
}

export class RoleAssignedEvent extends DomainEvent<RoleAssignedPayload> {
  static readonly TYPE = 'identity.authorization.role.assigned';

  readonly eventType = RoleAssignedEvent.TYPE;
  readonly aggregateId: string;
  readonly payload: RoleAssignedPayload;

  constructor(userId: string, payload: RoleAssignedPayload) {
    super();
    this.aggregateId = userId;
    this.payload = payload;
  }

  protected getPayload(): Record<string, unknown> {
    return { ...this.payload };
  }
}
