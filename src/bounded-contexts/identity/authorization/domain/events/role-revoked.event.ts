/**
 * Role Revoked Event
 *
 * Emitted when a role is removed from a user.
 */

import { DomainEvent } from '../../../shared-kernel/domain/events';

export interface RoleRevokedPayload {
  readonly roleId: string;
  readonly revokedBy: string;
  readonly reason: string;
}

export class RoleRevokedEvent extends DomainEvent<RoleRevokedPayload> {
  static readonly TYPE = 'identity.authorization.role.revoked';

  readonly eventType = RoleRevokedEvent.TYPE;
  readonly aggregateId: string;
  readonly payload: RoleRevokedPayload;

  constructor(userId: string, payload: RoleRevokedPayload) {
    super();
    this.aggregateId = userId;
    this.payload = payload;
  }

  protected getPayload(): Record<string, unknown> {
    return { ...this.payload };
  }
}
